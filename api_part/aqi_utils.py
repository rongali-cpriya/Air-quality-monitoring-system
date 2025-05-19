import aiohttp

async def fetch_aqi_data(station_id: str, session: aiohttp.ClientSession, token: str):
    """Fetch AQI data for a station ID asynchronously using aiohttp."""
    url = f"https://api.waqi.info/feed/@{station_id}/?token={token}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
            if response.status == 200:
                data = await response.json()
                if data.get("status") == "ok":
                    print(f"Fetched AQI data for station ID {station_id}")
                    return data["data"]
            print(f"Failed to fetch data for station {station_id}: HTTP {response.status}")
    except Exception as e:
        print(f"Error fetching AQI for station {station_id}: {e}")
    return None