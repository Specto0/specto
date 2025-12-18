from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    CheckConstraint, ForeignKey, Integer, Text, Boolean,
    Date, TIMESTAMP, text, Numeric, Index, String
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import CITEXT, JSONB

class Base(DeclarativeBase):
    pass

# ======================
# Tabelas base
# ======================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    theme_mode: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))
    
    # Gamification
    xp: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    level: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))

    # Role
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'user'"))

class Filme(Base):
    __tablename__ = "filmes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    titulo_original: Mapped[Optional[str]] = mapped_column(Text)
    ano: Mapped[Optional[int]] = mapped_column(Integer)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    poster_path: Mapped[Optional[str]] = mapped_column(Text)
    backdrop_path: Mapped[Optional[str]] = mapped_column(Text)
    media_avaliacao: Mapped[Optional[float]] = mapped_column(Numeric(3, 1))
    votos: Mapped[Optional[int]] = mapped_column(Integer)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

class Serie(Base):
    __tablename__ = "series"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    nome_original: Mapped[Optional[str]] = mapped_column(Text)
    primeira_exibicao: Mapped[Optional[datetime]] = mapped_column(Date)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    poster_path: Mapped[Optional[str]] = mapped_column(Text)
    backdrop_path: Mapped[Optional[str]] = mapped_column(Text)
    media_avaliacao: Mapped[Optional[float]] = mapped_column(Numeric(3, 1))
    votos: Mapped[Optional[int]] = mapped_column(Integer)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

class Genero(Base):
    __tablename__ = "generos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  
    nome: Mapped[str] = mapped_column(Text, nullable=False)

class FilmeGenero(Base):
    __tablename__ = "filme_generos"

    filme_id: Mapped[int] = mapped_column(ForeignKey("filmes.id", ondelete="CASCADE"), primary_key=True)
    genero_id: Mapped[int] = mapped_column(ForeignKey("generos.id", ondelete="CASCADE"), primary_key=True)

class SerieGenero(Base):
    __tablename__ = "serie_generos"

    serie_id: Mapped[int] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"), primary_key=True)
    genero_id: Mapped[int] = mapped_column(ForeignKey("generos.id", ondelete="CASCADE"), primary_key=True)

class Comentario(Base):
    __tablename__ = "comentarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filme_id: Mapped[Optional[int]] = mapped_column(ForeignKey("filmes.id", ondelete="CASCADE"))
    serie_id: Mapped[Optional[int]] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"))
    comentario_pai_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comentarios.id", ondelete="CASCADE"))
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    __table_args__ = (
        CheckConstraint(
            "(filme_id IS NOT NULL AND serie_id IS NULL) OR (filme_id IS NULL AND serie_id IS NOT NULL)",
            name="comentario_alvo_chk",
        ),
    )

class Like(Base):
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comentario_id: Mapped[int] = mapped_column(ForeignKey("comentarios.id", ondelete="CASCADE"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    __table_args__ = (
        # UNIQUE(user_id, comentario_id)
        Index("ix_likes_user_comentario_unq", "user_id", "comentario_id", unique=True),
    )

class Visto(Base):
    __tablename__ = "vistos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filme_id: Mapped[Optional[int]] = mapped_column(ForeignKey("filmes.id", ondelete="CASCADE"))
    serie_id: Mapped[Optional[int]] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"))
    data_visto: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))
    favorito: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))

    __table_args__ = (
        CheckConstraint(
            "(filme_id IS NOT NULL AND serie_id IS NULL) OR (filme_id IS NULL AND serie_id IS NOT NULL)",
            name="visto_alvo_chk",
        ),
        # Partial unique indexes:
        Index(
            "vistos_unq_user_filme",
            "user_id", "filme_id",
            unique=True,
            postgresql_where=text("filme_id IS NOT NULL"),
        ),
        Index(
            "vistos_unq_user_serie",
            "user_id", "serie_id",
            unique=True,
            postgresql_where=text("serie_id IS NOT NULL"),
        ),
    )

# ======================
# Índices adicionais
# ======================

# Pesquisa por título/nome
Index(
    "filmes_titulo_trgm",
    Filme.titulo,
    postgresql_using="gin",
    postgresql_ops={"titulo": "gin_trgm_ops"},
)

Index(
    "series_nome_trgm",
    Serie.nome,
    postgresql_using="gin",
    postgresql_ops={"nome": "gin_trgm_ops"},
)

# Índices
Index("comentarios_user_idx", Comentario.user_id)
Index("comentarios_filme_idx", Comentario.filme_id)
Index("comentarios_serie_idx", Comentario.serie_id)
Index("comentarios_pai_idx", Comentario.comentario_pai_id)

Index("likes_user_idx", Like.user_id)
Index("likes_comentario_idx", Like.comentario_id)

Index("vistos_user_idx", Visto.user_id)
Index("vistos_filme_idx", Visto.filme_id, postgresql_where=text("filme_id IS NOT NULL"))
Index("vistos_serie_idx", Visto.serie_id, postgresql_where=text("serie_id IS NOT NULL"))

Index("filme_generos_filme_idx", FilmeGenero.filme_id)
Index("filme_generos_genero_idx", FilmeGenero.genero_id)
Index("serie_generos_serie_idx", SerieGenero.serie_id)
Index("serie_generos_genero_idx", SerieGenero.genero_id)


class TmdbCachedFilme(Base):
    __tablename__ = "tmdb_cached_filmes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, nullable=False)
    genero_id: Mapped[int] = mapped_column(Integer, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    cached_em: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
        server_onupdate=text("now()"),
    )


Index(
    "tmdb_cache_tmdb_genero_unq",
    TmdbCachedFilme.tmdb_id,
    TmdbCachedFilme.genero_id,
    unique=True,
)
Index("tmdb_cache_genero_idx", TmdbCachedFilme.genero_id)

# ======================
# Fórum e Chat
# ======================

class ForumTopic(Base):
    __tablename__ = "forum_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # "movies" | "series" | "custom"
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Novos campos para tópicos dinâmicos
    tmdb_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    media_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "movie" | "tv"

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    posts = relationship("ForumPost", back_populates="topic", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="topic", cascade="all, delete-orphan")


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("forum_topics.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    topic = relationship("ForumTopic", back_populates="posts")
    user = relationship("User")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("forum_topics.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    topic = relationship("ForumTopic", back_populates="chat_messages")
    user = relationship("User")
    likes = relationship("ChatLike", back_populates="message", cascade="all, delete-orphan")


class ChatLike(Base):
    __tablename__ = "chat_likes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    message = relationship("ChatMessage", back_populates="likes")

    __table_args__ = (
        Index("ix_chat_likes_user_message_unq", "user_id", "message_id", unique=True),
    )


Index("forum_topics_type_idx", ForumTopic.type)
Index("forum_posts_topic_idx", ForumPost.topic_id)
Index("forum_posts_user_idx", ForumPost.user_id)
Index("chat_messages_topic_idx", ChatMessage.topic_id)
Index("chat_messages_user_idx", ChatMessage.user_id)
Index("chat_likes_message_idx", ChatLike.message_id)

Index("chat_likes_message_idx", ChatLike.message_id)


# ======================
# Gamification / Reputation
# ======================

class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(Text)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    condition_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "favorites_count", "comments_count"
    condition_value: Mapped[int] = mapped_column(Integer, nullable=False)    # e.g., 10, 50
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

    __table_args__ = (
        Index("ix_user_achievements_unq", "user_id", "achievement_id", unique=True),
    )
