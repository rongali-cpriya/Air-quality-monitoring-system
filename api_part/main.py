from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio
import aiohttp
from itertools import cycle
from database import SessionLocal, Base, engine
from utils import fetch_aqi_data, store_aqi_data
from dotenv import load_dotenv
import os
import time
from sqlalchemy import text

# Load environment variables from .env file
load_dotenv()
WAQI_API_TOKEN = os.getenv("API_TOKEN")
if not WAQI_API_TOKEN:
    raise ValueError("API_TOKEN not found in .env file")

# Initialize FastAPI application
app = FastAPI()

# Load station IDs from stations.txt with UTF-8 encoding
try:
    with open("stations.txt", "r", encoding="utf-8") as f:
        station_ids = []
        for line in f:
            stripped_line = line.strip()
            if stripped_line.isdigit():
                station_ids.append(stripped_line)
            else:
                print(f"Skipping invalid line in stations.txt: '{stripped_line}'")
    if not station_ids:
        raise ValueError("stations.txt is empty or contains no valid station IDs")
    print(f"Loaded {len(station_ids)} station IDs from stations.txt")
except FileNotFoundError:
    raise FileNotFoundError("stations.txt not found")
except UnicodeDecodeError as e:
    print(f"Encoding error in stations.txt: {e}")
    exit(1)

# Create a cyclic iterator for station IDs
station_iterator = cycle(station_ids)

# Verify database connection
print("Verifying database connection...")
try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Database connection successful: {result.scalar()}")
except Exception as e:
    print(f"Database connection failed: {e}")
    exit(1)

# Create database tables if they don’t exist
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables ensured")
except Exception as e:
    print(f"Error creating database tables: {e}")
    exit(1)

# Define lifespan context manager for FastAPI application
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage the lifecycle of the FastAPI app, including background tasks."""
    task = asyncio.create_task(update_aqi_loop())
    print("Started AQI update background task")
    yield
    task.cancel()
    print("Shut down AQI update background task")

# Re-initialize FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# Background task to periodically update AQI data
async def update_aqi_loop():
    """Run an infinite loop to fetch and store AQI data in batches."""
    async with aiohttp.ClientSession() as session:
        total_stations = len(station_ids)
        processed_stations = 0
        
        while True:
            print(f"Starting AQI fetch cycle at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            await process_batch(session)
            processed_stations += 100  # Process 100 stations per batch
            
            if processed_stations >= total_stations:
                print(f"Completed one full cycle. Resting for 20 minutes...")
                await asyncio.sleep(1200)  # Sleep for 20 minutes (1200 seconds)
                processed_stations = 0  # Reset counter for next cycle
            else:
                await asyncio.sleep(2)  # Short delay between batches

# Process a batch of 100 stations
async def process_batch(session):
    """Fetch and store AQI data for a batch of 100 stations."""
    station_ids_batch = [next(station_iterator) for _ in range(100)]
    tasks = [fetch_aqi_data(station_id, session, WAQI_API_TOKEN) for station_id in station_ids_batch]
    results = await asyncio.gather(*tasks)
    with SessionLocal() as db:
        for result in results:
            if result:
                store_aqi_data(result, db)  # Assumes store_aqi_data handles "N/A" correctly
    print(f"Processed batch of 100 stations: {station_ids_batch}")

# Run the FastAPI application
if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI application...")
    uvicorn.run(app, host="0.0.0.0", port=8001, workers=1)