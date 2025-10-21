import asyncio
from sqlalchemy import text
from app.core.db import engine

async def main():
    async with engine.connect() as conn:
        result = await conn.execute(text("select version(), current_timestamp"))
        row = result.first()
        print("Connected OK ")
        print("Postgres version:", row[0])
        print("Server time:", row[1])

if __name__ == "__main__":
    asyncio.run(main())
