from pydantic import BaseModel, EmailStr, Field


class LoginJSON(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    class Config:
        from_attributes = True  # Pydantic v2

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(Token):
    user: UserRead
    
