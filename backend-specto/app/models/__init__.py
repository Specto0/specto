from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    CheckConstraint, ForeignKey, Integer, Text, Boolean,
    Date, TIMESTAMP, text, Numeric, Index
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import CITEXT

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
    criado_em: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

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
