import httpx  # para fazer requests HTTP
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from config import API_KEY, BASE_URL
from routes import filmes, series

# Auth / Users
from app.routers import auth
from app.schemas.user import UserRead

app = FastAPI(title="Specto API")

# Routers da app
app.include_router(filmes.router, prefix="/filmes", tags=["Filmes"])
app.include_router(series.router, prefix="/series", tags=["Séries"])
app.include_router(auth.router)  # <--- ADICIONADO: rotas /auth/*

# CORS (abre para todos enquanto desenvolves)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Rotas auxiliares (TMDb) ----------
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

# ---------- Endpoint protegido ----------
@app.get("/me", response_model=UserRead)
async def me(user = Depends(auth.get_current_user)):
    return {"id": user.id, "username": user.username, "email": user.email}

# ---------- Log das rotas no arranque (debug) ----------
@app.on_event("startup")
async def _debug_routes():
    print("Rotas carregadas:")
    for r in app.routes:
        try:
            print(r.path, list(r.methods))
        except Exception:
            pass
