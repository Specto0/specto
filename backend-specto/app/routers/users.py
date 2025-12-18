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
from app.routers.auth import get_current_user

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

    # 4. Buscar conquistas
    from app.models import UserAchievement, Achievement
    achievements_query = (
        select(Achievement, UserAchievement.unlocked_at)
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == user.id)
    )
    achievements_res = await session.execute(achievements_query)
    achievements = [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon_url": a.icon_url,
            "xp_reward": a.xp_reward,
            "unlocked_at": unlocked_at
        }
        for a, unlocked_at in achievements_res.all()
    ]
    # 5. Montar resposta
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "avatar_url": build_avatar_url(user.avatar_url, request),
            "created_at": user.criado_em,
            "xp": user.xp,
            "level": user.level,
        },
        "stats": {
            "total_filmes": len(filmes),
            "total_series": len(series),
            "total_comentarios": total_comments,
            "total_likes_recebidos": total_likes_received,
        },
        "reputation": {
            "xp": user.xp,
            "level": user.level,
            "achievements": achievements
        },
        "vistos": {
            "filmes": filmes,
            "series": series,
        }
    }


@router.get("/me/reputation")
async def get_my_reputation(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    from app.models import UserAchievement, Achievement
    achievements_query = (
        select(Achievement, UserAchievement.unlocked_at)
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == user.id)
    )
    achievements_res = await session.execute(achievements_query)
    achievements = [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon_url": a.icon_url,
            "xp_reward": a.xp_reward,
            "unlocked_at": unlocked_at
        }
        for a, unlocked_at in achievements_res.all()
    ]
    
    # Also fetch all possible achievements to show locked ones
    all_achievements_res = await session.execute(select(Achievement))
    all_achievements = all_achievements_res.scalars().all()
    
    final_achievements = []
    unlocked_ids = {a["id"] for a in achievements}
    unlocked_map = {a["id"]: a for a in achievements}
    
    for ach in all_achievements:
        if ach.id in unlocked_ids:
            final_achievements.append(unlocked_map[ach.id])
        else:
            final_achievements.append({
                "id": ach.id,
                "name": ach.name,
                "description": ach.description,
                "icon_url": ach.icon_url,
                "xp_reward": ach.xp_reward,
                "unlocked_at": None
            })

    return {
        "xp": user.xp,
        "level": user.level,
        "achievements": final_achievements
    }
