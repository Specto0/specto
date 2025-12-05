from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.routers.auth import get_current_user
from app.core.security import decode_token
from app.schemas.forum import (
    ForumPostCreate,
    ForumPostOut,
    ForumTopItem,
    ForumTopicBase,
    ForumTopicDetail,
    UserMini,
    ForumTopicCreate,
    ForumTopList,
)
from app.models import ChatMessage, ForumPost, ForumTopic, User, ChatLike
from app.services.forum_top import fetch_top_items

router = APIRouter(prefix="/forum", tags=["Forum"])

# (Removed DEFAULT_TOPICS and _ensure_default_topics as we are moving to dynamic topics)


@router.get("/top-items", response_model=ForumTopList)
async def get_top_items():
    movies = await fetch_top_items("movies")
    series = await fetch_top_items("series")
    return ForumTopList(movies=movies, series=series)


@router.post("/topics/ensure", response_model=ForumTopicBase)
async def ensure_topic(
    payload: ForumTopicCreate,
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Verifica se já existe tópico para este filme/série
    query = select(ForumTopic).where(
        ForumTopic.tmdb_id == payload.tmdb_id,
        ForumTopic.media_type == payload.media_type
    )
    result = await session.execute(query)
    topic = result.scalars().first()

    if not topic:
        # Cria novo tópico
        topic = ForumTopic(
            type="custom",
            title=payload.title,
            description=f"Discussão sobre {payload.title}",
            tmdb_id=payload.tmdb_id,
            media_type=payload.media_type,
        )
        session.add(topic)
        await session.commit()
        await session.refresh(topic)

    return topic


@router.get("/topics", response_model=List[ForumTopicBase])
async def list_topics(
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Retorna tópicos "fixos" ou recentes? Por enquanto, retorna todos ou os mais recentes
    topics = await session.execute(select(ForumTopic).order_by(ForumTopic.created_at.desc()).limit(20))
    return topics.scalars().all()


@router.get("/topics/{topic_id}", response_model=ForumTopicDetail)
async def topic_detail(
    topic_id: int,
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    topic = await session.get(ForumTopic, topic_id)
    if not topic:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tópico não encontrado")

    posts_query = (
        select(ForumPost, User)
        .join(User, ForumPost.user_id == User.id)
        .where(ForumPost.topic_id == topic_id)
        .order_by(ForumPost.created_at.asc())
    )
    posts_result = await session.execute(posts_query)
    posts: List[ForumPostOut] = []
    for post, user in posts_result.all():
        posts.append(
            ForumPostOut(
                id=post.id,
                content=post.content,
                created_at=post.created_at,
                user=UserMini.from_orm(user),
            )
        )

    # Top items não faz muito sentido aqui mais, mas mantemos vazio ou removido do schema
    # Como o schema exige, mandamos vazio ou algo genérico
    top_items: List[ForumTopItem] = []

    return ForumTopicDetail(
        id=topic.id,
        type=topic.type,
        title=topic.title,
        description=topic.description,
        created_at=topic.created_at,
        topItems=top_items,
        posts=posts,
    )


@router.post("/topics/{topic_id}/posts", response_model=ForumPostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    topic_id: int,
    payload: ForumPostCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    topic = await session.get(ForumTopic, topic_id)
    if not topic:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tópico não encontrado")

    post = ForumPost(topic_id=topic_id, user_id=user.id, content=payload.content.strip())
    session.add(post)
    await session.commit()
    await session.refresh(post)

    return ForumPostOut(
        id=post.id,
        content=post.content,
        created_at=post.created_at,
        user=UserMini.from_orm(user),
    )


# ----------------- WebSocket Chat -----------------
class ChatManager:
    def __init__(self) -> None:
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, topic_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.setdefault(topic_id, []).append(websocket)

    def disconnect(self, topic_id: int, websocket: WebSocket) -> None:
        if topic_id not in self.connections:
            return
        if websocket in self.connections[topic_id]:
            self.connections[topic_id].remove(websocket)
        if not self.connections[topic_id]:
            self.connections.pop(topic_id, None)

    async def broadcast(self, topic_id: int, payload: dict) -> None:
        for ws in list(self.connections.get(topic_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                # Remove conexões quebradas silenciosamente
                self.disconnect(topic_id, ws)


manager = ChatManager()


async def _authenticate_websocket(token: str, session: AsyncSession) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token ausente")
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub", "0"))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Utilizador não existe")
    return user


def _extract_token_from_ws(websocket: WebSocket) -> Optional[str]:
    token = websocket.query_params.get("token")
    if token:
        return token
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1]
    return None


@router.websocket("/{topic_id}/ws")
async def websocket_forum(
    websocket: WebSocket,
    topic_id: int,
    session: AsyncSession = Depends(get_session),
):
    token = _extract_token_from_ws(websocket)
    try:
        user = await _authenticate_websocket(token, session)
    except HTTPException as exc:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=exc.detail)
        return

    topic = await session.get(ForumTopic, topic_id)
    if not topic:
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Tópico inexistente")
        return

    await manager.connect(topic_id, websocket)

    try:
        # Envia histórico das últimas 50 mensagens
        # Precisamos fazer join com likes para saber contagem e se user deu like?
        # Para simplificar, vamos fazer queries N+1 ou um join mais complexo.
        # Vamos de join manual ou selectinload se configurado.
        # Aqui faremos algo simples: buscar mensagens e depois popular likes.
        
        history_query = (
            select(ChatMessage, User)
            .join(User, ChatMessage.user_id == User.id)
            .where(ChatMessage.topic_id == topic_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(50)
        )
        history_result = await session.execute(history_query)
        
        # Carregar likes para estas mensagens
        # Uma abordagem melhor seria carregar tudo numa query, mas vamos iterar por simplicidade agora
        # ou fazer uma query de likes IN (msg_ids)
        
        messages_data = history_result.all() # [(msg, user), ...]
        history_payload: List[dict] = []
        
        # Coletar IDs para buscar likes em lote
        msg_ids = [m[0].id for m in messages_data]
        
        likes_map = {}
        user_likes_map = {}
        
        if msg_ids:
            # Contagem de likes por mensagem
            from sqlalchemy import func
            count_query = (
                select(ChatLike.message_id, func.count(ChatLike.id))
                .where(ChatLike.message_id.in_(msg_ids))
                .group_by(ChatLike.message_id)
            )
            count_res = await session.execute(count_query)
            for mid, count in count_res.all():
                likes_map[mid] = count
                
            # Likes do usuário atual
            user_likes_query = (
                select(ChatLike.message_id)
                .where(ChatLike.message_id.in_(msg_ids), ChatLike.user_id == user.id)
            )
            user_likes_res = await session.execute(user_likes_query)
            for mid in user_likes_res.scalars().all():
                user_likes_map[mid] = True

        for msg, msg_user in reversed(messages_data):
            history_payload.append(
                {
                    "id": msg.id,
                    "topic_id": topic_id,
                    "user": {"id": msg_user.id, "username": msg_user.username, "avatar_url": msg_user.avatar_url},
                    "message": msg.message,
                    "created_at": msg.created_at.isoformat(),
                    "likes": likes_map.get(msg.id, 0),
                    "liked_by_me": user_likes_map.get(msg.id, False),
                }
            )
        if history_payload:
            await websocket.send_json({"type": "history", "messages": history_payload})

        # Loop principal de mensagens
        while True:
            raw = await websocket.receive_text()
            message = raw.strip()
            if not message:
                continue

            chat = ChatMessage(topic_id=topic_id, user_id=user.id, message=message)
            session.add(chat)
            await session.commit()
            await session.refresh(chat)

            outgoing = {
                "id": chat.id,
                "topic_id": topic_id,
                "user": {"id": user.id, "username": user.username, "avatar_url": user.avatar_url},
                "message": chat.message,
                "created_at": chat.created_at.isoformat(),
                "likes": 0,
                "liked_by_me": False,
            }
            await manager.broadcast(topic_id, {"type": "message", "data": outgoing})

    except WebSocketDisconnect:
        manager.disconnect(topic_id, websocket)
    except Exception:
        manager.disconnect(topic_id, websocket)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Erro no chat")


@router.post("/messages/{message_id}/like")
async def toggle_message_like(
    message_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Verifica se a mensagem existe
    msg = await session.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")

    # Verifica se já deu like
    query = select(ChatLike).where(
        ChatLike.user_id == user.id,
        ChatLike.message_id == message_id
    )
    result = await session.execute(query)
    existing_like = result.scalars().first()

    if existing_like:
        # Remove like
        await session.delete(existing_like)
        liked = False
    else:
        # Adiciona like
        new_like = ChatLike(user_id=user.id, message_id=message_id)
        session.add(new_like)
        liked = True

    await session.commit()
    
    # Obter contagem atualizada
    from sqlalchemy import func
    count_query = select(func.count(ChatLike.id)).where(ChatLike.message_id == message_id)
    count_res = await session.execute(count_query)
    total_likes = count_res.scalar() or 0

    # Broadcast da atualização para todos no tópico
    # Precisamos reconstruir o objeto da mensagem ou mandar apenas o update parcial?
    # O frontend espera "update_message" com dados completos ou parciais.
    # Vamos mandar update parcial para ser mais leve, mas o frontend precisa saber lidar.
    # Ou mandamos o objeto "message" completo se quisermos simplificar, mas precisamos dos dados do user.
    
    # Vamos mandar um evento específico "like_update"
    await manager.broadcast(msg.topic_id, {
        "type": "like_update",
        "data": {
            "message_id": message_id,
            "likes": total_likes
        }
    })
    
    # Retorna o novo estado
    return {"liked": liked, "likes": total_likes}
