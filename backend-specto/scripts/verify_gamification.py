import asyncio
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.db import SessionLocal
from app.models import User, Achievement, UserAchievement, Visto
from app.services.gamification import GamificationService

async def verify_gamification():
    async with SessionLocal() as session:
        print("--- Verifying Gamification Logic ---")
        
        # 1. Create a test user
        print("Creating test user...")
        test_email = "gamification_test@example.com"
        user = await session.scalar(select(User).where(User.email == test_email))
        if user:
            await session.delete(user)
            await session.commit()
            
        user = User(username="GamificationTester", email=test_email, senha_hash="dummy")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"User created: ID={user.id}, XP={user.xp}, Level={user.level}")
        
        # 2. Create test achievements
        print("Creating test achievements...")
        ach1 = await session.scalar(select(Achievement).where(Achievement.name == "Test Fan"))
        if not ach1:
            ach1 = Achievement(
                name="Test Fan", 
                description="Add 1 favorite", 
                xp_reward=50, 
                condition_type="favorites_count", 
                condition_value=1
            )
            session.add(ach1)
        
        ach2 = await session.scalar(select(Achievement).where(Achievement.name == "Super Fan"))
        if not ach2:
            ach2 = Achievement(
                name="Super Fan", 
                description="Add 2 favorites", 
                xp_reward=100, 
                condition_type="favorites_count", 
                condition_value=2
            )
            session.add(ach2)
            
        await session.commit()
        
        # 3. Simulate adding a favorite
        print("Simulating adding 1st favorite...")
        # Manually trigger logic as if router did it
        await GamificationService.award_xp(session, user.id, 10)
        
        # Create dummy movie
        from app.models import Filme
        filme1 = await session.scalar(select(Filme).where(Filme.tmdb_id == 123))
        if not filme1:
            filme1 = Filme(tmdb_id=123, titulo="Test Movie 1")
            session.add(filme1)
            await session.flush()

        # Add Visto
        visto1 = Visto(user_id=user.id, filme_id=filme1.id, favorito=True)
        session.add(visto1)
        await session.flush()
        
        await GamificationService.check_achievements(session, user.id, "favorites_count")
        await session.commit()
        await session.refresh(user)
        
        print(f"User stats: XP={user.xp}, Level={user.level}")
        
        # Check achievement
        ua = await session.scalar(select(UserAchievement).where(UserAchievement.user_id == user.id, UserAchievement.achievement_id == ach1.id))
        if ua:
            print("SUCCESS: 'Test Fan' achievement unlocked!")
        else:
            print("FAILURE: 'Test Fan' achievement NOT unlocked.")
            
        # 4. Simulate adding 2nd favorite
        print("Simulating adding 2nd favorite...")
        await GamificationService.award_xp(session, user.id, 10)
        
        filme2 = await session.scalar(select(Filme).where(Filme.tmdb_id == 456))
        if not filme2:
            filme2 = Filme(tmdb_id=456, titulo="Test Movie 2")
            session.add(filme2)
            await session.flush()

        visto2 = Visto(user_id=user.id, filme_id=filme2.id, favorito=True)
        session.add(visto2)
        await session.flush()
        
        await GamificationService.check_achievements(session, user.id, "favorites_count")
        await session.commit()
        await session.refresh(user)
        
        print(f"User stats: XP={user.xp}, Level={user.level}")
        
        ua2 = await session.scalar(select(UserAchievement).where(UserAchievement.user_id == user.id, UserAchievement.achievement_id == ach2.id))
        if ua2:
            print("SUCCESS: 'Super Fan' achievement unlocked!")
        else:
            print("FAILURE: 'Super Fan' achievement NOT unlocked.")
            
        # Cleanup
        print("Cleaning up...")
        await session.delete(user)
        # Achievements can stay
        await session.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(verify_gamification())
