from fastapi import APIRouter
import httpx
from config import API_KEY, BASE_URL

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
            if v["site"] == "YouTube"
        ],
    }


@router.get("/populares")
def filmes_populares():
    url = f"{BASE_URL}/movie/popular?api_key={API_KEY}&language=pt-BR&page=1"
    resposta = httpx.get(url).json()
    return formatar_lista(resposta.get("results", []))


@router.get("/pesquisa")
def pesquisa_filmes(query: str):
    url = f"{BASE_URL}/search/movie?api_key={API_KEY}&language=pt-BR&query={query.strip()}"
    resposta = httpx.get(url).json()
    return formatar_lista(resposta.get("results", []))


@router.get("/detalhes/{filme_id}")
def detalhes_filme(filme_id: int):
    url = (
        f"{BASE_URL}/movie/{filme_id}"
        f"?api_key={API_KEY}&language=pt-BR"
        f"&append_to_response=credits,reviews,videos,images"
    )
    resposta = httpx.get(url).json()
    return formatar_detalhes(resposta)
