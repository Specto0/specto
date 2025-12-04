import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Sequence

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from config import API_KEY, BASE_URL
from app.core.db import get_session
from app.models import TmdbCachedFilme
from app.utils.http_cache import cached_get_json

router = APIRouter()
logger = logging.getLogger(__name__)

IMG_BASE = "https://image.tmdb.org/t/p"

CACHE_MIN_RESULTS = 60
CACHE_MAX_AGE = timedelta(hours=12)
CACHE_GENRE_PAGES = 5


def formatar_lista(filmes_raw: list) -> list:
    """Formata lista de filmes para uma resposta simples."""
    return [
        {
            "id": f["id"],
            "titulo": f.get("title"),
            "titulo_original": f.get("original_title"),
            "sinopse": f.get("overview"),
            "poster": f"{IMG_BASE}/w500{f['poster_path']}" if f.get("poster_path") else None,
            "backdrop": f"{IMG_BASE}/w500{f['backdrop_path']}" if f.get("backdrop_path") else None,
            "generos_ids": f.get("genre_ids", []),
            "data_lancamento": f.get("release_date"),
            "nota": f.get("vote_average"),
            "adulto": f.get("adult", False),
        }
        for f in filmes_raw
    ]


def formatar_detalhes(f: dict) -> dict:
    """Formata os detalhes completos de um filme."""
    return {
        "id": f["id"],
        "titulo": f.get("title"),
        "titulo_original": f.get("original_title"),
        "sinopse": f.get("overview"),
        "poster": f"{IMG_BASE}/w500{f['poster_path']}" if f.get("poster_path") else None,
        "backdrop": f"{IMG_BASE}/w500{f['backdrop_path']}" if f.get("backdrop_path") else None,
        "generos": [g["name"] for g in f.get("genres", [])],
        "data_lancamento": f.get("release_date"),
        "nota": f.get("vote_average"),
        "duracao": f.get("runtime"),
        "orcamento": f.get("budget"),
        "receita": f.get("revenue"),
        "elenco": [
            {
                "nome": c["name"],
                "personagem": c.get("character"),
                "foto": f"{IMG_BASE}/w200{c['profile_path']}" if c.get("profile_path") else None,
            }
            for c in f.get("credits", {}).get("cast", [])[:10]
        ],
        "reviews": [
            {"autor": r["author"], "conteudo": r["content"]}
            for r in f.get("reviews", {}).get("results", [])[:5]
        ],
        "videos": [
            {"tipo": v["type"], "site": v["site"], "chave": v["key"]}
            for v in f.get("videos", {}).get("results", [])
            if v.get("site") == "YouTube"
        ],
    }


async def _fetch_paginas(urls: Sequence[str]) -> list:
    respostas = await asyncio.gather(
        *(cached_get_json(url) for url in urls),
        return_exceptions=True,
    )
    resultados: list = []
    for dados in respostas:
        if isinstance(dados, Exception):
            continue
        resultados.extend(dados.get("results", []))
    return resultados


async def _fetch_genero_paginas(genero_id: int, paginas: int) -> list:
    urls = [
        f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=pt-PT&with_genres={genero_id}&page={page}"
        for page in range(1, paginas + 1)
    ]
    return await _fetch_paginas(urls)


def _build_cache_cutoff() -> datetime:
    now = datetime.now(timezone.utc)
    return now - CACHE_MAX_AGE


async def _load_genre_cache(
    session: AsyncSession,
    genero_id: int,
    allow_stale: bool = False,
) -> list:
    stmt = select(TmdbCachedFilme).where(TmdbCachedFilme.genero_id == genero_id)
    if not allow_stale:
        stmt = stmt.where(TmdbCachedFilme.cached_em >= _build_cache_cutoff())
    stmt = stmt.order_by(TmdbCachedFilme.cached_em.desc(), TmdbCachedFilme.ordem.asc())
    result = await session.execute(stmt)
    entries = result.scalars().all()
    return [entry.payload for entry in entries]


async def _upsert_genre_cache(session: AsyncSession, genero_id: int, filmes: list) -> None:
    if not filmes:
        return

    rows = []
    for idx, filme in enumerate(filmes):
        rows.append(
            {
                "tmdb_id": filme["id"],
                "genero_id": genero_id,
                "ordem": idx,
                "payload": filme,
            }
        )

    insert_stmt = pg_insert(TmdbCachedFilme).values(rows)
    upsert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=[TmdbCachedFilme.tmdb_id, TmdbCachedFilme.genero_id],
        set_={
            "payload": insert_stmt.excluded.payload,
            "ordem": insert_stmt.excluded.ordem,
            "cached_em": func.now(),
        },
    )
    await session.execute(upsert_stmt)
    await session.commit()


@router.get("/populares")
async def filmes_populares():
    paginas = 3
    urls = [
        f"{BASE_URL}/movie/popular?api_key={API_KEY}&language=pt-PT&page={page}"
        for page in range(1, paginas + 1)
    ]
    filmes = await _fetch_paginas(urls)
    return formatar_lista(filmes)


@router.get("/now-playing")
async def filmes_now_playing():
    url = f"{BASE_URL}/movie/now_playing?api_key={API_KEY}&language=pt-PT&page=1"
    dados = await cached_get_json(url)
    return formatar_lista(dados.get("results", []))


@router.get("/upcoming")
async def filmes_upcoming():
    url = f"{BASE_URL}/movie/upcoming?api_key={API_KEY}&language=pt-PT&page=1"
    dados = await cached_get_json(url)
    return formatar_lista(dados.get("results", []))


@router.get("/top-rated")
async def filmes_top_rated():
    url = f"{BASE_URL}/movie/top_rated?api_key={API_KEY}&language=pt-PT&page=1"
    dados = await cached_get_json(url)
    return formatar_lista(dados.get("results", []))


@router.get("/pesquisa")
async def pesquisa_filmes(query: str):
    url = f"{BASE_URL}/search/movie?api_key={API_KEY}&language=pt-PT&query={query.strip()}"
    dados = await cached_get_json(url)
    return formatar_lista(dados.get("results", []))


@router.get("/detalhes/{filme_id}")
async def detalhes_filme(filme_id: int):
    url = (
        f"{BASE_URL}/movie/{filme_id}"
        f"?api_key={API_KEY}&language=pt-PT"
        f"&append_to_response=credits,reviews,videos,images"
    )
    dados = await cached_get_json(url, ttl=600.0)
    return formatar_detalhes(dados)


@router.get("/{filme_id}/reviews")
async def reviews_filme(filme_id: int):
    url = f"{BASE_URL}/movie/{filme_id}/reviews?api_key={API_KEY}&language=pt-PT&page=1"
    dados = await cached_get_json(url)
    return [
        {"autor": r["author"], "conteudo": r["content"]}
        for r in dados.get("results", [])
    ]


@router.get("/{filme_id}/videos")
async def videos_filme(filme_id: int):
    url = f"{BASE_URL}/movie/{filme_id}/videos?api_key={API_KEY}&language=pt-PT"
    dados = await cached_get_json(url)
    return [
        {"tipo": v["type"], "site": v["site"], "chave": v["key"]}
        for v in dados.get("results", [])
        if v.get("site") == "YouTube"
    ]


@router.get("/{filme_id}/elenco")
async def elenco_filme(filme_id: int):
    url = f"{BASE_URL}/movie/{filme_id}/credits?api_key={API_KEY}&language=pt-PT"
    dados = await cached_get_json(url)
    return [
        {
            "nome": c["name"],
            "personagem": c.get("character"),
            "foto": f"{IMG_BASE}/w200{c['profile_path']}" if c.get("profile_path") else None,
        }
        for c in dados.get("cast", [])[:20]
    ]


@router.get("/genero/{genero_id}")
async def filmes_por_genero(
    genero_id: int,
    session: AsyncSession = Depends(get_session),
):
    cached = await _load_genre_cache(session, genero_id)
    if len(cached) >= CACHE_MIN_RESULTS:
        return cached

    try:
        filmes_raw = await _fetch_genero_paginas(genero_id, CACHE_GENRE_PAGES)
    except Exception as exc:  # pragma: no cover - fallback path
        logger.warning(
            "Falha ao atualizar cache de filmes do género %s: %s",
            genero_id,
            exc,
        )
        return cached or await _load_genre_cache(session, genero_id, allow_stale=True)

    filmes = formatar_lista(filmes_raw)
    await _upsert_genre_cache(session, genero_id, filmes)
    return filmes

@router.get("/{filme_id}/onde-assistir")
async def onde_assistir_filme(filme_id: int, pais: str = "PT"):
    url = f"{BASE_URL}/movie/{filme_id}/watch/providers?api_key={API_KEY}"
    dados = await cached_get_json(url)
    return dados.get("results", {}).get(pais, {})
