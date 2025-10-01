from fastapi import APIRouter
import httpx
from config import API_KEY
from config import BASE_URL

router = APIRouter()

def limpar_series(series_raw):
    series = []
    for s in series_raw:
        series.append({
            "id": s["id"],
            "titulo": s.get("name"),
            "original_name": s.get("original_name"),
            "sinopse": s.get("overview"),
            "poster": f"https://image.tmdb.org/t/p/w500{s['poster_path']}" if s.get("poster_path") else None,
            "backdrop": f"https://image.tmdb.org/t/p/w500{s['backdrop_path']}" if s.get("backdrop_path") else None,
            "generos_ids": s.get("genre_ids", []),
            "data_lancamento": s.get("first_air_date"),
            "nota": s.get("vote_average"),
            "adult": s.get("adult", False)
        })
    return series

@router.get("/populares")
def series_populares():
    url = f"{BASE_URL}/tv/popular?api_key={API_KEY}&language=pt-BR&page=1"
    series_raw = httpx.get(url).json().get("results", [])
    return limpar_series(series_raw)

@router.get("/pesquisa")
def pesquisa_series(query: str):
    query = query.strip()
    url = f"{BASE_URL}/search/tv?api_key={API_KEY}&language=pt-BR&query={query}"
    series_raw = httpx.get(url).json().get("results", [])
    return limpar_series(series_raw)

# ENDPOINT: detalhes completos da série
@router.get("/detalhes/{id}")
def detalhes_serie(id: int):
    url = f"{BASE_URL}/tv/{id}?api_key={API_KEY}&language=pt-BR&append_to_response=credits,reviews,videos,images"
    data = httpx.get(url).json()

    # elenco
    elenco = []
    for c in data.get("credits", {}).get("cast", []):
        elenco.append({
            "nome": c.get("name"),
            "personagem": c.get("character"),
            "foto": f"https://image.tmdb.org/t/p/w500{c['profile_path']}" if c.get("profile_path") else None
        })

    # reviews
    reviews = []
    for r in data.get("reviews", {}).get("results", []):
        reviews.append({
            "autor": r.get("author"),
            "conteudo": r.get("content")
        })

    # vídeos
    videos = []
    for v in data.get("videos", {}).get("results", []):
        videos.append({
            "tipo": v.get("type"),
            "site": v.get("site"),
            "chave": v.get("key")
        })

    # generos
    generos = [g["name"] for g in data.get("genres", [])]

    serie_final = {
        "id": data.get("id"),
        "titulo": data.get("name"),
        "original_name": data.get("original_name"),
        "sinopse": data.get("overview"),
        "poster": f"https://image.tmdb.org/t/p/w500{data['poster_path']}" if data.get("poster_path") else None,
        "backdrop": f"https://image.tmdb.org/t/p/w500{data['backdrop_path']}" if data.get("backdrop_path") else None,
        "generos": generos,
        "data_lancamento": data.get("first_air_date"),
        "nota": data.get("vote_average"),
        "adult": data.get("adult", False),
        "temporadas": data.get("number_of_seasons"),
        "episodios": data.get("number_of_episodes"),
        "orcamento": None,  # Não têm orçamento na API 
        "receita": None,    # Não têm receita na API 
        "elenco": elenco,
        "reviews": reviews,
        "videos": videos
    }

    return serie_final
