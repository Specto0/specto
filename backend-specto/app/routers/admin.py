from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime

from app.core.db import get_session
from app.models import User, Filme, Serie, Comentario, Visto, Achievement
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

# --- Dependencies ---

async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores."
        )
    return user

# --- Schemas ---

class DashboardStats(BaseModel):
    total_users: int
    total_movies_watched: int
    total_series_watched: int
    total_comments: int
    recent_users: List[dict]

class UserAdminRead(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime
    is_active: bool = True # Placeholder if we add active state later

class UserRoleUpdate(BaseModel):
    role: str

class CommentAdminRead(BaseModel):
    id: int
    user_id: int
    username: str
    content: str
    created_at: datetime
    target_type: str # "movie" or "serie"
    target_title: str

# --- Endpoints ---

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    # Counts
    total_users = await session.scalar(select(func.count(User.id)))
    total_movies_watched = await session.scalar(select(func.count(Visto.id)).where(Visto.filme_id.is_not(None)))
    total_series_watched = await session.scalar(select(func.count(Visto.id)).where(Visto.serie_id.is_not(None)))
    total_comments = await session.scalar(select(func.count(Comentario.id)))
    
    # Recent Users
    recent_users_res = await session.execute(
        select(User).order_by(desc(User.criado_em)).limit(5)
    )
    recent_users = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "created_at": u.criado_em
        } 
        for u in recent_users_res.scalars().all()
    ]
    
    return {
        "total_users": total_users or 0,
        "total_movies_watched": total_movies_watched or 0,
        "total_series_watched": total_series_watched or 0,
        "total_comments": total_comments or 0,
        "recent_users": recent_users
    }

@router.get("/users", response_model=List[UserAdminRead])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    query = select(User).offset(skip).limit(limit).order_by(User.id)
    
    if search:
        query = query.where(
            (User.username.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%"))
        )
        
    res = await session.execute(query)
    users = res.scalars().all()
    
    return [
        UserAdminRead(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            created_at=u.criado_em
        )
        for u in users
    ]

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    session: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin)
):
    if user_id == current_admin.id:
         raise HTTPException(400, "Não podes alterar o teu próprio cargo.")
         
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
        
    if payload.role not in ["user", "admin"]:
        raise HTTPException(400, "Cargo inválido")
        
    user.role = payload.role
    await session.commit()
    return {"message": "Cargo atualizado com sucesso"}

@router.get("/comments", response_model=List[CommentAdminRead])
async def list_comments(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    # Join with User, Filme, Serie to get details
    # This is a bit complex due to optional relationships, doing separate queries or careful joins
    # For simplicity, let's fetch comments and then populate details or use joinedload if configured
    # But our models don't have all relationships set up for eager loading easily in this direction maybe?
    # Let's try a direct select with joins
    
    query = (
        select(Comentario, User, Filme, Serie)
        .join(User, Comentario.user_id == User.id)
        .outerjoin(Filme, Comentario.filme_id == Filme.id)
        .outerjoin(Serie, Comentario.serie_id == Serie.id)
        .order_by(desc(Comentario.criado_em))
        .offset(skip)
        .limit(limit)
    )
    
    res = await session.execute(query)
    rows = res.all()
    
    result = []
    for comment, user, movie, serie in rows:
        target_type = "movie" if movie else "serie" if serie else "unknown"
        target_title = movie.titulo if movie else serie.nome if serie else "Unknown"
        
        result.append(CommentAdminRead(
            id=comment.id,
            user_id=user.id,
            username=user.username,
            content=comment.texto,
            created_at=comment.criado_em,
            target_type=target_type,
            target_title=target_title
        ))
        
    return result

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    comment = await session.get(Comentario, comment_id)
    if not comment:
        raise HTTPException(404, "Comentário não encontrado")
        
    await session.delete(comment)
    await session.commit()
    return {"message": "Comentário removido"}
