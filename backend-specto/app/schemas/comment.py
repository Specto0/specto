from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, Field, constr, field_validator


class CommentUser(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None


class CommentOut(BaseModel):
    id: int
    texto: str = Field(..., alias="texto")
    created_at: datetime = Field(..., alias="created_at")
    likes: int
    liked_by_user: bool
    user: CommentUser
    replies: List["CommentOut"] = []

    class Config:
        from_attributes = True
        populate_by_name = True


CommentOut.model_rebuild()


class CommentList(BaseModel):
    comentarios: List[CommentOut] = []


class CommentCreate(BaseModel):
    tmdb_id: int = Field(..., ge=1)
    tipo: Literal["filme", "serie"]
    texto: constr(min_length=1, max_length=2000)
    comentario_pai_id: Optional[int] = None
    alvo_titulo: Optional[str] = None

    @field_validator("texto")
    @classmethod
    def validar_texto(cls, valor: str) -> str:
        texto_limpo = valor.strip()
        if not texto_limpo:
            raise ValueError("O comentário não pode estar vazio.")
        return texto_limpo


class CommentLikeResponse(BaseModel):
    liked: bool
    likes: int
