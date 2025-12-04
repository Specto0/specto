import httpx  # para fazer requests HTTP
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import API_KEY, BASE_URL
from routes import filmes, series

# Auth / Users
from app.routers import auth, vistos, comentarios
from app.schemas.user import UserRead
from app.utils.http_cache import close_cache_client
from app.utils.avatars import STATIC_ROOT

app = FastAPI(title="Specto API")

# ----------------- Routers da app -----------------
app.include_router(filmes.router, prefix="/filmes", tags=["Filmes"])
app.include_router(series.router, prefix="/series", tags=["Séries"])
app.include_router(auth.router)           # rotas /auth/*
app.include_router(vistos.router)         # CRUD Vistos
app.include_router(comentarios.router)    # Comentários

# ----------------- CORS -----------------
# Versão simples e segura: permite qualquer origem,
# não usa credenciais (cookies), funciona bem com JWT em header.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # se quiseres, depois podemos limitar aos domínios da Vercel
    allow_credentials=False,    # TEM de ser False quando allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Static files (avatars) -----------------
app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

# ----------------- Rotas auxiliares (TMDb) -----------------
@app.get("/")
def root():
    return {"message": "FastAPI with TMDb connected!"}


@app.get("/filmes-populares")
def filmes_populares():
    url = f"{BASE_URL}/movie/popular?api_key={API_KEY}&language=pt-BR&page=1"
    response = httpx.get(url)
    return response.json()


@app.get("/series-populares")
def series_populares():
    url = f"{BASE_URL}/tv/popular?api_key={API_KEY}&language=pt-BR&page=1"
    response = httpx.get(url)
    return response.json()


@app.get("/pesquisa")
def pesquisa(query: str):
    query = query.strip()
    # Pesquisa filmes
    url_filmes = f"{BASE_URL}/search/movie?api_key={API_KEY}&language=pt-BR&query={query}"
    filmes_res = httpx.get(url_filmes).json()
    # Pesquisa séries
    url_series = f"{BASE_URL}/search/tv?api_key={API_KEY}&language=pt-BR&query={query}"
    series_res = httpx.get(url_series).json()
    # Retorna já no formato esperado pelo frontend
    return {
        "filmes": filmes_res.get("results", []),
        "series": series_res.get("results", []),
    }


@app.get("/filme/{id}")
def filme_detalhes(id: int):
    url = f"{BASE_URL}/movie/{id}?api_key={API_KEY}&language=pt-BR"
    f = httpx.get(url).json()
    return {
        "id": f["id"],
        "titulo": f.get("title"),
        "original_title": f.get("original_title"),
        "sinopse": f.get("overview"),
        "poster": f"https://image.tmdb.org/t/p/w500{f['poster_path']}" if f.get("poster_path") else None,
        "backdrop": f"https://image.tmdb.org/t/p/w500{f['backdrop_path']}" if f.get("backdrop_path") else None,
        "generos_ids": f.get("genre_ids", []),
        "data_lancamento": f.get("release_date"),
        "nota": f.get("vote_average"),
        "adult": f.get("adult", False),
    }

# ----------------- Endpoint protegido -----------------
@app.get("/me", response_model=UserRead)
async def me(request: Request, user=Depends(auth.get_current_user)):
    return auth.user_to_read(user, request)


# ----------------- Shutdown -----------------
@app.on_event("shutdown")
async def shutdown_event():
    await close_cache_client()
