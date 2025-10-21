from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from fastapi.security import OAuth2PasswordRequestForm


from app.core.db import get_session
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.schemas.user import AuthResponse, UserCreate, UserRead
from app.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    # duplicados por username OU email
    res = await session.execute(select(User).where(or_(User.username == payload.username, User.email == payload.email)))
    if res.scalar_one_or_none():
        raise HTTPException(400, "Username ou email já existe.")
    user = User(username=payload.username, email=payload.email, senha_hash=hash_password(payload.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

# ===== LOGIN =====
@router.post("/login", response_model=AuthResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
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

    return {"access_token": access_token, "token_type": "bearer", "user": user}


# Dependência para endpoints protegidos
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)) -> User:
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

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_: User = Depends(get_current_user)) -> None:
    # JWT é stateless: nada a invalidar no servidor.
    return None
