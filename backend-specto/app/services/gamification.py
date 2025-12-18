from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models import User, Achievement, UserAchievement, Visto, Comentario
from datetime import datetime

class GamificationService:
    XP_PER_FAVORITE = 10
    XP_PER_COMMENT = 5
    XP_PER_WATCHED = 2
    
    LEVEL_THRESHOLDS = {
        1: 0,
        2: 100,
        3: 300,
        4: 600,
        5: 1000,
        6: 1500,
        7: 2100,
        8: 2800,
        9: 3600,
        10: 4500
    }

    @staticmethod
    def get_level_for_xp(xp: int) -> int:
        current_level = 1
        for level, threshold in sorted(GamificationService.LEVEL_THRESHOLDS.items()):
            if xp >= threshold:
                current_level = level
            else:
                break
        return current_level

    @staticmethod
    async def award_xp(db: Session, user_id: int, amount: int):
        user = await db.get(User, user_id)
        if not user:
            return
        
        user.xp += amount
        new_level = GamificationService.get_level_for_xp(user.xp)
        
        if new_level > user.level:
            user.level = new_level
            # TODO: Notify user of level up (could be via websocket or just stored for next fetch)
            
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def check_achievements(db: Session, user_id: int, action_type: str):
        """
        Checks and awards achievements based on the user's stats.
        action_type can be 'favorite', 'comment', 'watched' to optimize checks.
        """
        # Fetch all achievements that match the condition type
        # In a real scenario, we might want to cache this or filter by not-yet-unlocked
        result = await db.scalars(
            select(Achievement).where(Achievement.condition_type == action_type)
        )
        possible_achievements = result.all()
        
        if not possible_achievements:
            return

        # Get current stats based on action_type
        current_value = 0
        if action_type == "favorites_count":
            current_value = await db.scalar(
                select(func.count(Visto.id)).where(Visto.user_id == user_id, Visto.favorito == True)
            ) or 0
        elif action_type == "comments_count":
            current_value = await db.scalar(
                select(func.count(Comentario.id)).where(Comentario.user_id == user_id)
            ) or 0
        elif action_type == "watched_count":
             current_value = await db.scalar(
                select(func.count(Visto.id)).where(Visto.user_id == user_id)
            ) or 0
            
        # Check and award
        for achievement in possible_achievements:
            if current_value >= achievement.condition_value:
                # Check if already unlocked
                existing = await db.scalar(
                    select(UserAchievement).where(
                        UserAchievement.user_id == user_id,
                        UserAchievement.achievement_id == achievement.id
                    )
                )
                if not existing:
                    new_unlock = UserAchievement(user_id=user_id, achievement_id=achievement.id)
                    db.add(new_unlock)
                    # Award XP for achievement
                    await GamificationService.award_xp(db, user_id, achievement.xp_reward)
                    await db.commit()

