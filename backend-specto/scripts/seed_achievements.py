#!/usr/bin/env python3
"""
Seed script to populate the achievements table with professional badges.
Run with: python scripts/seed_achievements.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, delete
from app.core.db import SessionLocal
from app.models import Achievement


ACHIEVEMENTS = [
    # 🎬 Watched (watched_count)
    {
        "name": "Estreia",
        "description": "Marcaste o teu primeiro título como visto",
        "icon_url": "🎬",
        "xp_reward": 10,
        "condition_type": "watched_count",
        "condition_value": 1,
    },
    {
        "name": "Cinéfilo Casual",
        "description": "10 títulos vistos - estás a ganhar ritmo!",
        "icon_url": "🍿",
        "xp_reward": 25,
        "condition_type": "watched_count",
        "condition_value": 10,
    },
    {
        "name": "Maratonista",
        "description": "25 títulos vistos - impressionante!",
        "icon_url": "⏱️",
        "xp_reward": 50,
        "condition_type": "watched_count",
        "condition_value": 25,
    },
    {
        "name": "Viciado em Ecrãs",
        "description": "50 títulos vistos - sem pausas!",
        "icon_url": "📺",
        "xp_reward": 100,
        "condition_type": "watched_count",
        "condition_value": 50,
    },
    {
        "name": "Lenda do Streaming",
        "description": "100 títulos vistos - és uma lenda!",
        "icon_url": "👑",
        "xp_reward": 200,
        "condition_type": "watched_count",
        "condition_value": 100,
    },
    # ❤️ Favorites (favorites_count)
    {
        "name": "Primeiro Amor",
        "description": "Adicionaste o teu primeiro favorito",
        "icon_url": "💖",
        "xp_reward": 10,
        "condition_type": "favorites_count",
        "condition_value": 1,
    },
    {
        "name": "Colecionador",
        "description": "5 favoritos - estás a construir a tua coleção!",
        "icon_url": "⭐",
        "xp_reward": 25,
        "condition_type": "favorites_count",
        "condition_value": 5,
    },
    {
        "name": "Curador",
        "description": "15 favoritos - tens bom gosto!",
        "icon_url": "🎭",
        "xp_reward": 50,
        "condition_type": "favorites_count",
        "condition_value": 15,
    },
    {
        "name": "Crítico Exigente",
        "description": "30 favoritos - a tua lista é valiosa",
        "icon_url": "🏅",
        "xp_reward": 100,
        "condition_type": "favorites_count",
        "condition_value": 30,
    },
    # 💬 Comments (comments_count)
    {
        "name": "Primeira Palavra",
        "description": "Publicaste o teu primeiro comentário",
        "icon_url": "✍️",
        "xp_reward": 10,
        "condition_type": "comments_count",
        "condition_value": 1,
    },
    {
        "name": "Ativo na Comunidade",
        "description": "5 comentários - a tua voz conta!",
        "icon_url": "💬",
        "xp_reward": 25,
        "condition_type": "comments_count",
        "condition_value": 5,
    },
    {
        "name": "Influenciador",
        "description": "20 comentários - inspiraste muitos!",
        "icon_url": "🎤",
        "xp_reward": 50,
        "condition_type": "comments_count",
        "condition_value": 20,
    },
    {
        "name": "Orador Nato",
        "description": "50 comentários - és o centro da conversa!",
        "icon_url": "🗣️",
        "xp_reward": 100,
        "condition_type": "comments_count",
        "condition_value": 50,
    },
]


async def seed_achievements():
    """Insert or update achievements in the database."""
    async with SessionLocal() as session:
        print("🏆 Seeding achievements...")
        
        # Get existing achievements by name
        result = await session.execute(select(Achievement))
        existing = {a.name: a for a in result.scalars().all()}
        
        created = 0
        updated = 0
        
        for data in ACHIEVEMENTS:
            if data["name"] in existing:
                # Update existing
                ach = existing[data["name"]]
                ach.description = data["description"]
                ach.icon_url = data["icon_url"]
                ach.xp_reward = data["xp_reward"]
                ach.condition_type = data["condition_type"]
                ach.condition_value = data["condition_value"]
                updated += 1
            else:
                # Create new
                ach = Achievement(**data)
                session.add(ach)
                created += 1
        
        await session.commit()
        print(f"✅ Done! Created: {created}, Updated: {updated}")
        print(f"📊 Total achievements: {len(ACHIEVEMENTS)}")


if __name__ == "__main__":
    asyncio.run(seed_achievements())
