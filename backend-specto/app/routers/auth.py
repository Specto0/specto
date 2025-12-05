from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    UploadFile,
    File,
    status,
    Response,       # 👈 ADICIONADO
)
from fastapi.security import OAuth2PasswordBearer, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from fastapi.security import OAuth2PasswordRequestForm

from app.core.db import get_session
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.schemas.user import AuthResponse, UserCreate, UserRead, UserUpdate
from app.models import User
from app.utils.avatars import build_avatar_url, delete_avatar_file, save_avatar_file

router = APIRouter(prefix="/auth", tags=["Auth"])


def user_to_read(user: User, request: Optional[Request] = None) -> UserRead:
    theme_value = "light" if user.theme_mode is False else "dark"
    return UserRead(
        id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=build_avatar_url(user.avatar_url, request),
        theme_mode=theme_value,
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    # duplicados por username OU email
    res = await session.execute(
        select(User).where(
            or_(User.username == payload.username, User.email == payload.email)
        )
    )
    if res.scalar_one_or_none():
        raise HTTPException(400, "Username ou email já existe.")

    user = User(
        username=payload.username,
        email=payload.email,
        senha_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user_to_read(user, request)


# ===== LOGIN =====
@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    response: Response,   # 👈 ADICIONADO: para podermos definir cookies
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    # No OAuth2PasswordRequestForm o campo chama-se "username", mas aqui é o email
    email = form_data.username.strip()

    user = await session.scalar(select(User).where(User.email == email))
    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    access_token = create_access_token(
        user.id,
        extra_claims={"username": user.username},
    )

    # 👇 continua a devolver EXACTAMENTE o mesmo JSON de antes
    #    (para o frontend guardar o token onde quiser)
    auth_payload: AuthResponse = AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_to_read(user, request),
    )

    # 👇 EXTRA: mete também o token num cookie, caso queiras usar cookies no futuro
    #    (só vai ser enviado se o frontend usar credentials: "include")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,      # mantém True: Railway está em HTTPS
        samesite="none",  # obrigatório para funcionar entre domínios diferentes (Vercel ↔ Railway)
    )

    return auth_payload


# Dependência para endpoints protegidos
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub", "0"))
    except (JWTError, ValueError):
        raise HTTPException(401, "Token inválido ou expirado")
    res = await session.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "Utilizador não existe")
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> Optional[User]:
    if credentials is None:
        return None

    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub", "0"))
    except (JWTError, ValueError):
        return None

    res = await session.execute(select(User).where(User.id == user_id))
    return res.scalar_one_or_none()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_: User = Depends(get_current_user)) -> None:
    # JWT é stateless: nada a invalidar no servidor.
    return None


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> UserRead:
    updated = False
    avatar_to_remove: Optional[str] = None

    if payload.email and payload.email.lower() != user.email.lower():
        email_exists = await session.scalar(
            select(User).where(User.email == payload.email, User.id != user.id)
        )
        if email_exists:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Email já está a ser utilizado."
            )
        user.email = payload.email
        updated = True

    if payload.password:
        user.senha_hash = hash_password(payload.password)
        updated = True

    if payload.remove_avatar and user.avatar_url:
        avatar_to_remove = user.avatar_url
        user.avatar_url = None
        updated = True

    if payload.theme_mode is not None:
        if isinstance(payload.theme_mode, bool):
            desired = payload.theme_mode
        else:
            theme = payload.theme_mode.strip().lower()
            if theme not in {"light", "dark"}:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Tema inválido. Usa 'light' ou 'dark'.",
                )
            desired = theme == "dark"

        if user.theme_mode != desired:
            user.theme_mode = desired
            updated = True

    if not updated:
        return user_to_read(user, request)

    session.add(user)
    await session.commit()
    await session.refresh(user)

    if avatar_to_remove:
        delete_avatar_file(avatar_to_remove)

    return user_to_read(user, request)


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> UserRead:
    previous_avatar = user.avatar_url
    stored_path = await save_avatar_file(file, user.id)
    user.avatar_url = stored_path
    session.add(user)
    await session.commit()
    await session.refresh(user)

    if previous_avatar and previous_avatar != stored_path:
        delete_avatar_file(previous_avatar)

    return user_to_read(user, request)
