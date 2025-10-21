from typing import Optional, Dict, Any, Union
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.settings import settings
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

def create_access_token(subject: Union[str, int], expires_minutes: Optional[int] = None, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    if expires_minutes is None:
        expires_minutes = settings.access_token_expire_minutes
    expire = datetime.now(tz=timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode: Dict[str, Any] = {"sub": str(subject), "exp": expire}
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
