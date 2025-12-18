from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Filme, Serie, User, Visto
from app.routers.auth import get_current_user
from app.schemas.visto import VistoCreate, VistoItem, VistoList, VistoUpdate

router = APIRouter(prefix="/vistos", tags=["Vistos"])


def _parse_year(data_str: Optional[str]) -> Optional[int]:
    if not data_str:
        return None
    try:
        return int(data_str[:4])
    except ValueError:
        return None


def _parse_date(data_str: Optional[str]) -> Optional[date]:
    if not data_str:
        return None
    try:
        return datetime.strptime(data_str, "%Y-%m-%d").date()
    except ValueError:
        return None


async def _get_or_create_filme(session: AsyncSession, payload: VistoCreate) -> Filme:
    filme = await session.scalar(select(Filme).where(Filme.tmdb_id == payload.tmdb_id))
    ano = _parse_year(payload.data_lancamento)

    if not filme:
        filme = Filme(
            tmdb_id=payload.tmdb_id,
            titulo=payload.titulo,
            titulo_original=payload.titulo_original,
            ano=ano,
            descricao=payload.descricao,
            poster_path=payload.poster_path,
            backdrop_path=payload.backdrop_path,
            media_avaliacao=payload.media_avaliacao,
            votos=payload.votos,
        )
        session.add(filme)
        await session.flush()
    else:
        if payload.titulo:
            filme.titulo = payload.titulo
        if payload.titulo_original:
            filme.titulo_original = payload.titulo_original
        if ano is not None:
            filme.ano = ano
        if payload.descricao:
            filme.descricao = payload.descricao
        if payload.poster_path:
            filme.poster_path = payload.poster_path
        if payload.backdrop_path:
            filme.backdrop_path = payload.backdrop_path
        if payload.media_avaliacao is not None:
            filme.media_avaliacao = payload.media_avaliacao
        if payload.votos is not None:
            filme.votos = payload.votos

    return filme


async def _get_or_create_serie(session: AsyncSession, payload: VistoCreate) -> Serie:
    serie = await session.scalar(select(Serie).where(Serie.tmdb_id == payload.tmdb_id))
    primeira_exibicao = _parse_date(payload.data_lancamento)

    if not serie:
        serie = Serie(
            tmdb_id=payload.tmdb_id,
            nome=payload.titulo,
            nome_original=payload.titulo_original,
            primeira_exibicao=primeira_exibicao,
            descricao=payload.descricao,
            poster_path=payload.poster_path,
            backdrop_path=payload.backdrop_path,
            media_avaliacao=payload.media_avaliacao,
            votos=payload.votos,
        )
        session.add(serie)
        await session.flush()
    else:
        if payload.titulo:
            serie.nome = payload.titulo
        if payload.titulo_original:
            serie.nome_original = payload.titulo_original
        if primeira_exibicao is not None:
            serie.primeira_exibicao = primeira_exibicao
        if payload.descricao:
            serie.descricao = payload.descricao
        if payload.poster_path:
            serie.poster_path = payload.poster_path
        if payload.backdrop_path:
            serie.backdrop_path = payload.backdrop_path
        if payload.media_avaliacao is not None:
            serie.media_avaliacao = payload.media_avaliacao
        if payload.votos is not None:
            serie.votos = payload.votos

    return serie


def _map_visto(visto: Visto, filme: Optional[Filme], serie: Optional[Serie]) -> VistoItem:
    if filme:
        return VistoItem(
            id=visto.id,
            tipo="filme",
            tmdb_id=filme.tmdb_id,
            titulo=filme.titulo,
            titulo_original=filme.titulo_original,
            descricao=filme.descricao,
            poster_path=filme.poster_path,
            backdrop_path=filme.backdrop_path,
            favorito=visto.favorito,
            data_visto=visto.data_visto,
            media_avaliacao=float(filme.media_avaliacao) if filme.media_avaliacao is not None else None,
            votos=filme.votos,
        )

    if serie:
        return VistoItem(
            id=visto.id,
            tipo="serie",
            tmdb_id=serie.tmdb_id,
            titulo=serie.nome,
            titulo_original=serie.nome_original,
            descricao=serie.descricao,
            poster_path=serie.poster_path,
            backdrop_path=serie.backdrop_path,
            favorito=visto.favorito,
            data_visto=visto.data_visto,
            media_avaliacao=float(serie.media_avaliacao) if serie.media_avaliacao is not None else None,
            votos=serie.votos,
        )

    # Não deveria acontecer, mas evita crash
    return VistoItem(
        id=visto.id,
        tipo="filme",
        tmdb_id=0,
        titulo="Desconhecido",
        favorito=visto.favorito,
        data_visto=visto.data_visto,
    )


@router.get("/", response_model=VistoList)
async def listar_vistos(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VistoList:
    stmt = (
        select(Visto, Filme, Serie)
        .outerjoin(Filme, Filme.id == Visto.filme_id)
        .outerjoin(Serie, Serie.id == Visto.serie_id)
        .where(Visto.user_id == user.id)
        .order_by(Visto.data_visto.desc())
    )

    result = await session.execute(stmt)
    filmes: list[VistoItem] = []
    series: list[VistoItem] = []

    for visto, filme, serie in result.all():
        item = _map_visto(visto, filme, serie)
        if item.tipo == "filme":
            filmes.append(item)
        else:
            series.append(item)

    return VistoList(filmes=filmes, series=series)


@router.post("/", response_model=VistoItem, status_code=status.HTTP_201_CREATED)
async def criar_visto(
    payload: VistoCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VistoItem:
    if payload.tipo == "filme":
        alvo = await _get_or_create_filme(session, payload)
        stmt = select(Visto).where(Visto.user_id == user.id, Visto.filme_id == alvo.id)
    else:
        alvo = await _get_or_create_serie(session, payload)
        stmt = select(Visto).where(Visto.user_id == user.id, Visto.serie_id == alvo.id)

    existente = await session.scalar(stmt)

    favorito_flag = bool(payload.favorito) if payload.favorito is not None else False

    # Gamification Logic
    from app.services.gamification import GamificationService
    
    if existente:
        # Se já existia, verificamos se mudou para favorito
        was_favorite = existente.favorito
        if payload.favorito is not None:
            existente.favorito = favorito_flag
        
        await session.commit()
        await session.refresh(existente)
        target_visto = existente
        
        if not was_favorite and favorito_flag:
             await GamificationService.award_xp(session, user.id, GamificationService.XP_PER_FAVORITE)
             await GamificationService.check_achievements(session, user.id, "favorites_count")

    else:
        target_visto = Visto(
            user_id=user.id,
            filme_id=alvo.id if payload.tipo == "filme" else None,
            serie_id=alvo.id if payload.tipo == "serie" else None,
            favorito=favorito_flag,
        )
        session.add(target_visto)
        
        # Award XP for watching
        await GamificationService.award_xp(session, user.id, GamificationService.XP_PER_WATCHED)
        await GamificationService.check_achievements(session, user.id, "watched_count")
        
        if favorito_flag:
             await GamificationService.award_xp(session, user.id, GamificationService.XP_PER_FAVORITE)
             await GamificationService.check_achievements(session, user.id, "favorites_count")

        await session.commit()
        await session.refresh(target_visto)

    return _map_visto(
        target_visto,
        alvo if payload.tipo == "filme" else None,
        alvo if payload.tipo == "serie" else None,
    )


@router.patch("/{visto_id}", response_model=VistoItem)
async def atualizar_visto(
    visto_id: int,
    payload: VistoUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VistoItem:
    visto = await session.get(Visto, visto_id)
    if not visto or visto.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visto não encontrado.")

    was_favorite = visto.favorito
    if payload.favorito is not None:
        visto.favorito = payload.favorito

    # Gamification Logic
    from app.services.gamification import GamificationService
    if not was_favorite and payload.favorito:
         await GamificationService.award_xp(session, user.id, GamificationService.XP_PER_FAVORITE)
         await GamificationService.check_achievements(session, user.id, "favorites_count")

    await session.commit()
    await session.refresh(visto)

    filme = await session.get(Filme, visto.filme_id) if visto.filme_id else None
    serie = await session.get(Serie, visto.serie_id) if visto.serie_id else None

    return _map_visto(visto, filme, serie)


@router.delete("/{visto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_visto(
    visto_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Response:
    visto = await session.get(Visto, visto_id)
    if not visto or visto.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visto não encontrado.")

    await session.delete(visto)
    await session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Personalized Recommendations ---
import asyncio
from config import API_KEY, BASE_URL
from app.utils.http_cache import cached_get_json

IMG_BASE = "https://image.tmdb.org/t/p"


def _format_recommendation(item: dict, media_type: str) -> dict:
    """Formata um item de recomendação."""
    title_key = "title" if media_type == "movie" else "name"
    date_key = "release_date" if media_type == "movie" else "first_air_date"
    
    return {
        "id": item["id"],
        "tipo": "filme" if media_type == "movie" else "serie",
        "titulo": item.get(title_key),
        "poster": f"{IMG_BASE}/w500{item['poster_path']}" if item.get("poster_path") else None,
        "backdrop": f"{IMG_BASE}/w500{item['backdrop_path']}" if item.get("backdrop_path") else None,
        "nota": item.get("vote_average"),
        "data_lancamento": item.get(date_key),
        "sinopse": item.get("overview", "")[:200] + "..." if item.get("overview") and len(item.get("overview", "")) > 200 else item.get("overview"),
    }


async def _fetch_tmdb_recommendations(tmdb_id: int, media_type: str) -> list:
    """Busca recomendações da TMDB para um filme ou série."""
    url = f"{BASE_URL}/{media_type}/{tmdb_id}/recommendations?api_key={API_KEY}&language=pt-PT"
    try:
        data = await cached_get_json(url)
        return data.get("results", [])[:5]  # Limitar a 5 por item
    except Exception:
        return []


@router.get("/recomendacoes")
async def get_recomendacoes(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Retorna recomendações personalizadas baseadas nos filmes e séries que o utilizador viu.
    Prioriza favoritos para gerar recomendações mais relevantes.
    """
    # Buscar todos os vistos do utilizador com os filmes/séries associados
    stmt = (
        select(Visto, Filme, Serie)
        .outerjoin(Filme, Filme.id == Visto.filme_id)
        .outerjoin(Serie, Serie.id == Visto.serie_id)
        .where(Visto.user_id == user.id)
        .order_by(Visto.favorito.desc(), Visto.data_visto.desc())  # Favoritos primeiro
    )

    result = await session.execute(stmt)
    vistos_data = result.all()

    if not vistos_data:
        return {
            "recomendacoes": [],
            "baseado_em": [],
            "mensagem": "Marca alguns filmes ou séries como vistos para receberes recomendações personalizadas!"
        }

    # Coletar IDs de filmes/séries já vistos para excluir das recomendações
    vistos_filme_ids = set()
    vistos_serie_ids = set()
    
    for visto, filme, serie in vistos_data:
        if filme:
            vistos_filme_ids.add(filme.tmdb_id)
        if serie:
            vistos_serie_ids.add(serie.tmdb_id)

    # Pegar os últimos 5 vistos (priorizando favoritos) para buscar recomendações
    vistos_para_recomendar = vistos_data[:5]
    
    baseado_em = []
    tasks = []
    
    for visto, filme, serie in vistos_para_recomendar:
        if filme:
            baseado_em.append({"tipo": "filme", "titulo": filme.titulo, "tmdb_id": filme.tmdb_id})
            tasks.append(_fetch_tmdb_recommendations(filme.tmdb_id, "movie"))
        elif serie:
            baseado_em.append({"tipo": "serie", "titulo": serie.nome, "tmdb_id": serie.tmdb_id})
            tasks.append(_fetch_tmdb_recommendations(serie.tmdb_id, "tv"))

    # Buscar recomendações em paralelo
    all_recommendations = await asyncio.gather(*tasks)
    
    # Processar e remover duplicados
    seen_ids = {"filme": set(), "serie": set()}
    unique_recommendations = []
    
    for recs in all_recommendations:
        for item in recs:
            item_id = item["id"]
            # Determinar tipo baseado nas chaves presentes
            is_movie = "title" in item
            media_type = "movie" if is_movie else "tv"
            tipo = "filme" if is_movie else "serie"
            
            # Excluir se já visto ou já adicionado
            already_watched = (tipo == "filme" and item_id in vistos_filme_ids) or \
                            (tipo == "serie" and item_id in vistos_serie_ids)
            
            if not already_watched and item_id not in seen_ids[tipo]:
                seen_ids[tipo].add(item_id)
                formatted = _format_recommendation(item, media_type)
                unique_recommendations.append(formatted)

    # Ordenar por nota e limitar a 20
    unique_recommendations.sort(key=lambda x: x.get("nota") or 0, reverse=True)
    unique_recommendations = unique_recommendations[:20]

    return {
        "recomendacoes": unique_recommendations,
        "baseado_em": baseado_em,
        "mensagem": f"Recomendações baseadas em {len(baseado_em)} {'título' if len(baseado_em) == 1 else 'títulos'} que viste"
    }

