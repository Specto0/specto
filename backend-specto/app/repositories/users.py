from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User

async def get_user_by_username_or_email(session: AsyncSession, identifier: str) -> Optional[User]:
    stmt = select(User).where((User.username == identifier) | (User.email == identifier))
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def get_user_by_username(session: AsyncSession, username: str) -> Optional[User]:
    stmt = select(User).where(User.username == username)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()
