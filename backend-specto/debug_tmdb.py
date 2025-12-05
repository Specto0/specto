import asyncio
import httpx
import sys
import os

# Add current dir to sys.path to import config
sys.path.append(os.getcwd())
from config import API_KEY, BASE_URL

async def test_endpoint(name, url, params):
    print(f"\nTesting {name}...")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params)
            print(f"Status: {res.status_code}")
            if res.status_code != 200:
                print(f"Error: {res.text}")
            else:
                data = res.json()
                results = data.get("results", [])
                print(f"Found {len(results)} items.")
                for item in results[:3]:
                    print(f"- {item.get('title') or item.get('name')} ({item.get('vote_average')})")
    except Exception as e:
        print(f"Exception: {e}")

async def test_tmdb():
    print(f"Using API Key: {API_KEY[:5]}...")
    
    # 1. Test Original (Discover)
    # Copied params from forum_top.py
    start = "2025-12-01" # Mock date
    end = "2026-01-01"
    params_discover = {
        "api_key": API_KEY,
        "language": "pt-BR",
        "sort_by": "vote_average.desc",
        "vote_count.gte": 50,
        "page": 1,
        "with_original_language": "en",
        "primary_release_date.gte": start,
        "primary_release_date.lt": end,
    }
    await test_endpoint("Discover (Original)", f"{BASE_URL}/discover/movie", params_discover)

    # 2. Test Trending (Proposed)
    params_trending = {
        "api_key": API_KEY,
        "language": "pt-BR",
    }
    await test_endpoint("Trending (Proposed)", f"{BASE_URL}/trending/movie/week", params_trending)

if __name__ == "__main__":
    asyncio.run(test_tmdb())
