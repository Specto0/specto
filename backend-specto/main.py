
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import API_KEY, BASE_URL
from routes import filmes, series

# Auth / Users
from app.routers import auth, vistos, comentarios, users
from app.routers import forum as forum_router
from app.schemas.user import UserRead
from app.utils.http_cache import close_cache_client, cached_get_json
from app.utils.avatars import STATIC_ROOT

app = FastAPI(title="Specto API")

# ----------------- CORS -----------------
# Aberto para as origens do front (localhost, preview e produção Vercel).
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",  # preview Vite
    "http://127.0.0.1:4173",
    "https://localhost:5173",
    "https://127.0.0.1:5173",
    "https://specto-jet.vercel.app",
    "https://specto-git-main-danielsilvas-projects-77f71c9c.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,  # JWT em headers (sem cookies cross-site)
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Static files (avatars) -----------------
app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

# ----------------- Routers da app -----------------
# (mantemos sem prefix aqui, pois cada router já tem o seu próprio prefix)
app.include_router(filmes.router, prefix="/filmes", tags=["Filmes"])
app.include_router(series.router, prefix="/series", tags=["Séries"])
app.include_router(auth.router)         # rotas /auth/*
app.include_router(vistos.router)       # CRUD Vistos
app.include_router(comentarios.router)  # Comentários
app.include_router(forum_router.router) # Fórum e chat
app.include_router(users.router)        # Perfil público


# ----------------- Health check / root -----------------
@app.get("/", tags=["Health"])
def root():
    """Endpoint simples para health check (Railway + teste rápido)."""
    return {"message": "FastAPI with TMDb connected!"}


# ----------------- Rotas auxiliares (TMDb) -----------------
@app.get("/filmes-populares", tags=["Filmes"], name="filmes_populares_public")
async def filmes_populares():
    url = f"{BASE_URL}/movie/popular?api_key={API_KEY}&language=pt-BR&page=1"
    return await cached_get_json(url, ttl=3600)


@app.get("/series-populares", tags=["Séries"], name="series_populares_public")
async def series_populares():
    url = f"{BASE_URL}/tv/popular?api_key={API_KEY}&language=pt-BR&page=1"
    return await cached_get_json(url, ttl=3600)


@app.get("/pesquisa", tags=["Pesquisa"])
async def pesquisa(query: str):
    query = query.strip()

    # Pesquisa filmes
    url_filmes = f"{BASE_URL}/search/movie?api_key={API_KEY}&language=pt-BR&query={query}"
    filmes_res = await cached_get_json(url_filmes, ttl=300)

    # Pesquisa séries
    url_series = f"{BASE_URL}/search/tv?api_key={API_KEY}&language=pt-BR&query={query}"
    series_res = await cached_get_json(url_series, ttl=300)

    # Retorna já no formato esperado pelo frontend
    return {
        "filmes": filmes_res.get("results", []),
        "series": series_res.get("results", []),
    }


@app.get("/filme/{id}", tags=["Filmes"])
async def filme_detalhes(id: int):
    url = f"{BASE_URL}/movie/{id}?api_key={API_KEY}&language=pt-BR"
    f = await cached_get_json(url, ttl=3600)
    return {
        "id": f["id"],
        "titulo": f.get("title"),
        "original_title": f.get("original_title"),
        "sinopse": f.get("overview"),
        "poster": (
            f"https://image.tmdb.org/t/p/w500{f['poster_path']}"
            if f.get("poster_path") else None
        ),
        "backdrop": (
            f"https://image.tmdb.org/t/p/w500{f['backdrop_path']}"
            if f.get("backdrop_path") else None
        ),
        "generos_ids": f.get("genre_ids", []),
        "data_lancamento": f.get("release_date"),
        "nota": f.get("vote_average"),
        "adult": f.get("adult", False),
    }


# ----------------- Endpoint protegido -----------------
@app.get("/me", response_model=UserRead, tags=["Auth"])
async def me(request: Request, user=Depends(auth.get_current_user)):
    return auth.user_to_read(user, request)


# ----------------- Shutdown -----------------
@app.on_event("shutdown")
async def shutdown_event():
    await close_cache_client()
