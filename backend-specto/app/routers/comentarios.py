from collections import defaultdict
from typing import Dict, List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Comentario, Filme, Serie, Like, User
from app.routers.auth import get_current_user, get_current_user_optional
from app.schemas.comment import CommentCreate, CommentLikeResponse, CommentList, CommentOut, CommentUser
from app.utils.avatars import build_avatar_url

router = APIRouter(prefix="/comentarios", tags=["Comentários"])


async def _get_target(
    session: AsyncSession,
    tipo: Literal["filme", "serie"],
    tmdb_id: int,
):
    model = Filme if tipo == "filme" else Serie
    field = Filme.tmdb_id if tipo == "filme" else Serie.tmdb_id
    result = await session.execute(select(model).where(field == tmdb_id))
    return result.scalar_one_or_none()


async def _ensure_target(
    session: AsyncSession,
    tipo: Literal["filme", "serie"],
    tmdb_id: int,
    titulo: Optional[str],
):
    target = await _get_target(session, tipo, tmdb_id)
    if target:
        return target

    titulo_base = "Filme" if tipo == "filme" else "Série"
    titulo_final = (titulo or "").strip() or f"{titulo_base} {tmdb_id}"

    if tipo == "filme":
        novo = Filme(tmdb_id=tmdb_id, titulo=titulo_final)
    else:
        novo = Serie(tmdb_id=tmdb_id, nome=titulo_final)

    session.add(novo)
    await session.flush()
    return novo


async def _build_comment_tree(
    session: AsyncSession,
    comments: List[Comentario],
    current_user_id: Optional[int],
    request: Optional[Request],
) -> List[CommentOut]:
    if not comments:
        return []

    comment_ids = [c.id for c in comments]
    user_ids = {c.user_id for c in comments}

    user_rows = await session.execute(
        select(User.id, User.username, User.avatar_url).where(User.id.in_(user_ids))
    )
    user_map: Dict[int, CommentUser] = {}
    for row in user_rows:
        avatar_url = build_avatar_url(row[2], request)
        user_map[row[0]] = CommentUser(id=row[0], username=row[1], avatar_url=avatar_url)

    likes_rows = await session.execute(
        select(Like.comentario_id, func.count(Like.id))
        .where(Like.comentario_id.in_(comment_ids))
        .group_by(Like.comentario_id)
    )
    likes_map = {row[0]: row[1] for row in likes_rows}

    liked_set: set[int] = set()
    if current_user_id:
        liked_rows = await session.execute(
            select(Like.comentario_id).where(
                Like.comentario_id.in_(comment_ids), Like.user_id == current_user_id
            )
        )
        liked_set = {row[0] for row in liked_rows}

    branch: Dict[Optional[int], List[Comentario]] = defaultdict(list)
    for comment in comments:
        branch[comment.comentario_pai_id].append(comment)

    def build_branch(parent_id: Optional[int]) -> List[CommentOut]:
        nodes: List[CommentOut] = []
        for comment in branch.get(parent_id, []):
            author = user_map.get(comment.user_id)
            if not author:
                author = CommentUser(
                    id=comment.user_id,
                    username="Utilizador",
                    avatar_url=None,
                )
            node = CommentOut(
                id=comment.id,
                texto=comment.texto,
                created_at=comment.criado_em,
                likes=likes_map.get(comment.id, 0),
                liked_by_user=comment.id in liked_set,
                user=author,
                replies=build_branch(comment.id),
            )
            nodes.append(node)
        return nodes

    return build_branch(None)


@router.get("/{tipo}/{tmdb_id}", response_model=CommentList)
async def listar_comentarios(
    tipo: Literal["filme", "serie"],
    tmdb_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    target = await _get_target(session, tipo, tmdb_id)
    if not target:
        return CommentList(comentarios=[])

    condition = (
        Comentario.filme_id == target.id
        if tipo == "filme"
        else Comentario.serie_id == target.id
    )

    result = await session.execute(
        select(Comentario).where(condition).order_by(Comentario.criado_em.asc())
    )
    comentarios = result.scalars().all()

    arvore = await _build_comment_tree(
        session,
        comentarios,
        current_user.id if current_user else None,
        request,
    )
    return CommentList(comentarios=arvore)


@router.post("/", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def criar_comentario(
    payload: CommentCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    target = await _ensure_target(session, payload.tipo, payload.tmdb_id, payload.alvo_titulo)

    if payload.comentario_pai_id:
        parent = await session.get(Comentario, payload.comentario_pai_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Comentário pai não encontrado.")
        if payload.tipo == "filme" and parent.filme_id != target.id:
            raise HTTPException(status_code=400, detail="Comentário pai pertence a outro título.")
        if payload.tipo == "serie" and parent.serie_id != target.id:
            raise HTTPException(status_code=400, detail="Comentário pai pertence a outro título.")

    comentario = Comentario(
        user_id=user.id,
        filme_id=target.id if payload.tipo == "filme" else None,
        serie_id=target.id if payload.tipo == "serie" else None,
        comentario_pai_id=payload.comentario_pai_id,
        texto=payload.texto,
    )

    session.add(comentario)
    
    # Gamification Logic
    from app.services.gamification import GamificationService
    await GamificationService.award_xp(session, user.id, GamificationService.XP_PER_COMMENT)
    await GamificationService.check_achievements(session, user.id, "comments_count")

    await session.commit()
    await session.refresh(comentario)

    comment_user = CommentUser(
        id=user.id,
        username=user.username,
        avatar_url=build_avatar_url(user.avatar_url, request),
    )
    return CommentOut(
        id=comentario.id,
        texto=comentario.texto,
        created_at=comentario.criado_em,
        likes=0,
        liked_by_user=False,
        user=comment_user,
        replies=[],
    )


@router.post("/{comentario_id}/like", response_model=CommentLikeResponse)
async def alternar_like(
    comentario_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    comentario = await session.get(Comentario, comentario_id)
    if not comentario:
        raise HTTPException(status_code=404, detail="Comentário não encontrado.")

    result = await session.execute(
        select(Like).where(Like.comentario_id == comentario_id, Like.user_id == user.id)
    )
    existente = result.scalar_one_or_none()

    if existente:
        await session.delete(existente)
        liked = False
    else:
        novo_like = Like(user_id=user.id, comentario_id=comentario_id)
        session.add(novo_like)
        liked = True

    await session.commit()

    likes_result = await session.execute(
        select(func.count(Like.id)).where(Like.comentario_id == comentario_id)
    )
    likes = likes_result.scalar_one()

    return CommentLikeResponse(liked=liked, likes=likes)
