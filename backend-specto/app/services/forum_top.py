from typing import List



from app.schemas.forum import ForumTopItem
from app.utils.http_cache import cached_get_json
from config import API_KEY, BASE_URL


async def fetch_top_items(topic_type: str) -> List[ForumTopItem]:
    """
    Busca top 5 filmes/séries da semana (Trending) na TMDB.
    Se falhar, devolve uma lista fixa de fallback.
    """
    topic_type = topic_type.lower()
    resource = "movie" if topic_type == "movies" else "tv"
    
    # Usar endpoint de Trending para resultados mais interessantes
    url = f"{BASE_URL}/trending/{resource}/week?api_key={API_KEY}&language=pt-BR"

    try:
        # Usar cache de 1 hora (3600s) para evitar chamadas repetidas
        data = await cached_get_json(url, ttl=3600)
        results = data.get("results", [])
    except Exception as e:
        print(f"Erro ao buscar top items ({topic_type}): {e}")
        return _fallback_items(topic_type)

    items: List[ForumTopItem] = []
    for raw in results[:5]:
        items.append(
            ForumTopItem(
                id=raw.get("id"),
                title=raw.get("title") or raw.get("name") or "Título desconhecido",
                poster_url=(
                    f"https://image.tmdb.org/t/p/w500{raw['poster_path']}"
                    if raw.get("poster_path")
                    else None
                ),
                rating=raw.get("vote_average"),
            )
        )
    return items or _fallback_items(topic_type)


def _fallback_items(topic_type: str) -> List[ForumTopItem]:
    if topic_type == "series":
        return [
            ForumTopItem(id=9001, title="Série A", poster_url=None, rating=8.7),
            ForumTopItem(id=9002, title="Série B", poster_url=None, rating=8.4),
            ForumTopItem(id=9003, title="Série C", poster_url=None, rating=8.3),
            ForumTopItem(id=9004, title="Série D", poster_url=None, rating=8.1),
            ForumTopItem(id=9005, title="Série E", poster_url=None, rating=8.0),
        ]
    return [
        ForumTopItem(id=8001, title="Filme A", poster_url=None, rating=8.8),
        ForumTopItem(id=8002, title="Filme B", poster_url=None, rating=8.5),
        ForumTopItem(id=8003, title="Filme C", poster_url=None, rating=8.4),
        ForumTopItem(id=8004, title="Filme D", poster_url=None, rating=8.2),
        ForumTopItem(id=8005, title="Filme E", poster_url=None, rating=8.0),
    ]
