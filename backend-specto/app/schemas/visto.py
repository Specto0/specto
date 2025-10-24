from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class VistoCreate(BaseModel):
    tipo: Literal["filme", "serie"]
    tmdb_id: int
    titulo: str
    titulo_original: Optional[str] = None
    descricao: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    data_lancamento: Optional[str] = Field(
        default=None,
        description="Data no formato ISO (YYYY-MM-DD). Usado para ano/primeira exibição.",
    )
    media_avaliacao: Optional[float] = None
    votos: Optional[int] = None
    favorito: Optional[bool] = None


class VistoUpdate(BaseModel):
    favorito: Optional[bool] = None


class VistoItem(BaseModel):
    id: int
    tipo: Literal["filme", "serie"]
    tmdb_id: int
    titulo: str
    titulo_original: Optional[str] = None
    descricao: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    favorito: bool
    data_visto: datetime
    media_avaliacao: Optional[float] = None
    votos: Optional[int] = None

    class Config:
        from_attributes = True


class VistoList(BaseModel):
    filmes: list[VistoItem]
    series: list[VistoItem]
