from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Filme, Serie, User, Visto
from app.routers.vistos import _map_visto
from app.schemas.user import UserRead
from app.schemas.visto import VistoList, VistoItem
from app.utils.avatars import build_avatar_url

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}/profile")
async def get_public_profile(
    user_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    # 1. Buscar usuário
    query = select(User).where(User.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")

    # 2. Buscar vistos (filmes e séries)
    stmt = (
        select(Visto, Filme, Serie)
        .outerjoin(Filme, Filme.id == Visto.filme_id)
        .outerjoin(Serie, Serie.id == Visto.serie_id)
        .where(Visto.user_id == user.id)
        .order_by(Visto.data_visto.desc())
    )

    vistos_res = await session.execute(stmt)
    filmes: List[VistoItem] = []
    series: List[VistoItem] = []

    for visto, filme, serie in vistos_res.all():
        item = _map_visto(visto, filme, serie)
        if item.tipo == "filme":
            filmes.append(item)
        else:
            series.append(item)

    # 3. Calcular estatísticas
    from sqlalchemy import func
    from app.models import Comentario, Like

    # Total de comentários
    count_comments_query = select(func.count(Comentario.id)).where(Comentario.user_id == user.id)
    count_comments_res = await session.execute(count_comments_query)
    total_comments = count_comments_res.scalar() or 0

    # Total de likes recebidos (likes em comentários do user)
    count_likes_query = (
        select(func.count(Like.id))
        .join(Comentario, Like.comentario_id == Comentario.id)
        .where(Comentario.user_id == user.id)
    )
    count_likes_res = await session.execute(count_likes_query)
    total_likes_received = count_likes_res.scalar() or 0

    # 4. Montar resposta
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "avatar_url": build_avatar_url(user.avatar_url, request),
            "created_at": user.criado_em,
        },
        "stats": {
            "total_filmes": len(filmes),
            "total_series": len(series),
            "total_comentarios": total_comments,
            "total_likes_recebidos": total_likes_received,
        },
        "vistos": {
            "filmes": filmes,
            "series": series,
        }
    }
