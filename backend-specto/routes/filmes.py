import asyncio
from typing import List

from fastapi import APIRouter

from config import API_KEY, BASE_URL
from app.utils.http_cache import cached_get_json

router = APIRouter()

IMG_BASE = "https://image.tmdb.org/t/p"


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


async def _fetch_paginas(urls: List[str]) -> list:
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
async def filmes_por_genero(genero_id: int):
    url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=pt-PT&with_genres={genero_id}&page=1"
    dados = await cached_get_json(url)
    return formatar_lista(dados.get("results", []))
