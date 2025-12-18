import asyncio
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.db import SessionLocal
from app.models import User
from app.core.security import hash_password

async def create_admin():
    async with SessionLocal() as session:
        print("--- Creating Admin User ---")
        
        email = "admin@gmail.com"
        password = "admin123"
        
        # Check if user exists
        user = await session.scalar(select(User).where(User.email == email))
        
        if user:
            print(f"User {email} already exists. Updating role and password...")
            user.role = "admin"
            user.senha_hash = hash_password(password)
            # Ensure username is also admin-like if desired, but email is key
        else:
            print(f"Creating new user {email}...")
            user = User(
                username="Admin",
                email=email,
                senha_hash=hash_password(password),
                role="admin"
            )
            session.add(user)
            
        await session.commit()
        await session.refresh(user)
        
        print(f"Admin user ready: ID={user.id}, Email={user.email}, Role={user.role}")

if __name__ == "__main__":
    asyncio.run(create_admin())
