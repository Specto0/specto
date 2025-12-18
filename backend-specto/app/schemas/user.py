from typing import Optional, Literal, Union
from pydantic import BaseModel, EmailStr, Field, model_validator

ThemeLiteral = Literal["light", "dark"]


class LoginJSON(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

ThemeValue = Union[ThemeLiteral, bool, None]


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    avatar_url: Optional[str] = None
    theme_mode: ThemeValue = "dark"
    xp: int = 0
    level: int = 1
    role: str = "user"

    class Config:
        from_attributes = True  # Pydantic v2

    @model_validator(mode="after")
    def normalize_theme(cls, values: "UserRead") -> "UserRead":
        theme = values.theme_mode
        if isinstance(theme, bool):
            values.theme_mode = "dark" if theme else "light"
        elif isinstance(theme, str):
            values.theme_mode = "light" if theme.strip().lower() == "light" else "dark"
        else:
            values.theme_mode = "dark"
        return values

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    remove_avatar: bool = False
    theme_mode: Optional[ThemeValue] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(Token):
    user: UserRead
    
