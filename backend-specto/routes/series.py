from fastapi import APIRouter
import httpx
from config import API_KEY, BASE_URL

router = APIRouter()
IMG_BASE = "https://image.tmdb.org/t/p"


def formatar_lista(series_raw: list) -> list:
    """Formata lista de séries para uma resposta simples."""
    return [
        {
            "id": s["id"],
            "titulo": s.get("name"),
            "original_name": s.get("original_name"),
            "sinopse": s.get("overview"),
            "poster": f"{IMG_BASE}/w500{s['poster_path']}" if s.get("poster_path") else None,
            "backdrop": f"{IMG_BASE}/w500{s['backdrop_path']}" if s.get("backdrop_path") else None,
            "generos_ids": s.get("genre_ids", []),
            "data_lancamento": s.get("first_air_date"),
            "nota": s.get("vote_average"),
            "adult": s.get("adult", False)
        }
        for s in series_raw
    ]


def formatar_detalhes(s: dict) -> dict:
    """Formata detalhes completos da série."""
    elenco = [
        {
            "nome": c.get("name"),
            "personagem": c.get("character"),
            "foto": f"{IMG_BASE}/w200{c['profile_path']}" if c.get("profile_path") else None
        }
        for c in s.get("credits", {}).get("cast", [])[:20]
    ]

    reviews = [
        {"autor": r.get("author"), "conteudo": r.get("content")}
        for r in s.get("reviews", {}).get("results", [])[:5]
    ]

    videos = [
        {"tipo": v.get("type"), "site": v.get("site"), "chave": v.get("key")}
        for v in s.get("videos", {}).get("results", [])
        if v.get("site") == "YouTube"
    ]

    generos = [g["name"] for g in s.get("genres", [])]

    return {
        "id": s.get("id"),
        "titulo": s.get("name"),
        "original_name": s.get("original_name"),
        "sinopse": s.get("overview"),
        "poster": f"{IMG_BASE}/w500{s['poster_path']}" if s.get("poster_path") else None,
        "backdrop": f"{IMG_BASE}/w500{s['backdrop_path']}" if s.get("backdrop_path") else None,
        "generos": generos,
        "data_lancamento": s.get("first_air_date"),
        "nota": s.get("vote_average"),
        "adult": s.get("adult", False),
        "temporadas": s.get("number_of_seasons"),
        "episodios": s.get("number_of_episodes"),
        "orcamento": None,
        "receita": None,
        "elenco": elenco,
        "reviews": reviews,
        "videos": videos
    }


# ------------------- ENDPOINTS -------------------

@router.get("/populares")
def series_populares():
    url = f"{BASE_URL}/tv/popular?api_key={API_KEY}&language=pt-BR&page=1"
    series_raw = httpx.get(url).json().get("results", [])
    return formatar_lista(series_raw)


@router.get("/top-rated")
def series_top_rated():
    url = f"{BASE_URL}/tv/top_rated?api_key={API_KEY}&language=pt-BR&page=1"
    series_raw = httpx.get(url).json().get("results", [])
    return formatar_lista(series_raw)


@router.get("/on-air")
def series_on_air():
    url = f"{BASE_URL}/tv/on_the_air?api_key={API_KEY}&language=pt-BR&page=1"
    series_raw = httpx.get(url).json().get("results", [])
    return formatar_lista(series_raw)


@router.get("/upcoming")
def series_upcoming():
    url = f"{BASE_URL}/tv/airing_today?api_key={API_KEY}&language=pt-BR&page=1"
    series_raw = httpx.get(url).json().get("results", [])
    return formatar_lista(series_raw)


@router.get("/pesquisa")
def pesquisa_series(query: str):
    query = query.strip()
    url = f"{BASE_URL}/search/tv?api_key={API_KEY}&language=pt-BR&query={query}"
    series_raw = httpx.get(url).json().get("results", [])
    return formatar_lista(series_raw)


@router.get("/detalhes/{serie_id}")
def detalhes_serie(serie_id: int):
    url = f"{BASE_URL}/tv/{serie_id}?api_key={API_KEY}&language=pt-BR&append_to_response=credits,reviews,videos,images"
    data = httpx.get(url).json()
    return formatar_detalhes(data)


@router.get("/{serie_id}/reviews")
def reviews_serie(serie_id: int):
    url = f"{BASE_URL}/tv/{serie_id}/reviews?api_key={API_KEY}&language=pt-BR&page=1"
    resposta = httpx.get(url).json()
    return [
        {"autor": r["author"], "conteudo": r["content"]}
        for r in resposta.get("results", [])
    ]


@router.get("/{serie_id}/videos")
def videos_serie(serie_id: int):
    url = f"{BASE_URL}/tv/{serie_id}/videos?api_key={API_KEY}&language=pt-BR"
    resposta = httpx.get(url).json()
    return [
        {"tipo": v["type"], "site": v["site"], "chave": v["key"]}
        for v in resposta.get("results", [])
        if v.get("site") == "YouTube"
    ]


@router.get("/{serie_id}/elenco")
def elenco_serie(serie_id: int):
    url = f"{BASE_URL}/tv/{serie_id}/credits?api_key={API_KEY}&language=pt-BR"
    resposta = httpx.get(url).json()
    return [
        {
            "nome": c.get("name"),
            "personagem": c.get("character"),
            "foto": f"{IMG_BASE}/w200{c['profile_path']}" if c.get("profile_path") else None
        }
        for c in resposta.get("cast", [])[:20]
    ]


@router.get("/genero/{genero_id}")
def series_por_genero(genero_id: int):
    url = f"{BASE_URL}/discover/tv?api_key={API_KEY}&language=pt-BR&with_genres={genero_id}&page=1"
    series_raw = httpx.get(url).json().get("results", [])
    return formatar_lista(series_raw)
