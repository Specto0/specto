from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class ForumTopicBase(BaseModel):
    id: int
    type: str
    title: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ForumTopItem(BaseModel):
    id: int
    title: str
    poster_url: Optional[str] = None
    rating: Optional[float] = None


class UserMini(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ForumPostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

    @validator("content")
    def strip_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Conteúdo obrigatório")
        return cleaned


class ForumPostOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    user: UserMini

    class Config:
        from_attributes = True


class ForumTopicDetail(ForumTopicBase):
    topItems: List[ForumTopItem] = []
    posts: List[ForumPostOut] = []


class ChatMessageOut(BaseModel):
    id: int
    topic_id: int
    user: UserMini
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class ForumTopicCreate(BaseModel):
    tmdb_id: int
    media_type: str  # "movie" | "tv"
    title: str


class ForumTopList(BaseModel):
    movies: List[ForumTopItem]
    series: List[ForumTopItem]

