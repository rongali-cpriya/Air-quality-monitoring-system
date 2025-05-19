from models import StationInfo
from database import engine, Base
import requests
import time
from itertools import islice
import os
TOKEN = os.getenv("API_TOKEN")
BATCH_SIZE = 100
SLEEP_INTERVAL = 1

def fetch_station_details(station_id):
    """Fetch station details from the WAQI API."""
    url = f"https://api.waqi.info/feed/@{station_id}/?token={TOKEN}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                city = data["data"]["city"]
                station_name = city["name"]
                lat, lon = city["geo"]
                return station_name, lat, lon
        print(f"Failed to fetch details for station {station_id}")
    except Exception as e:
        print(f"Error fetching details for station {station_id}: {e}")
    return None, None, None

def populate_station_info():
    """Populate the station_info table with data from stations.txt in batches."""
    from sqlalchemy.orm import sessionmaker
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    with open("stations.txt", "r") as f:
        station_ids = [line.strip() for line in f if line.strip()]

    total_stations = len(station_ids)
    print(f"Total stations to process: {total_stations}")

    for i in range(0, total_stations, BATCH_SIZE):
        batch = list(islice(station_ids[i:], 0, BATCH_SIZE))
        print(f"Processing batch {i // BATCH_SIZE + 1}: stations {i + 1} to {i + len(batch)}")

        for station_id in batch:
            station_id = int(station_id)
            existing = session.query(StationInfo).filter_by(station_id=station_id).first()
            if existing:
                print(f"Station {station_id} already in database")
                continue

            station_name, lat, lon = fetch_station_details(station_id)
            if station_name and lat and lon:
                station = StationInfo(
                    station_id=station_id,
                    station_name=station_name,
                    latitude=float(lat),
                    longitude=float(lon)
                )
                session.add(station)
                session.commit()
                print(f"Added station {station_id}: {station_name}")
            else:
                print(f"Could not fetch details for station {station_id}")

        if i + BATCH_SIZE < total_stations:
            print(f"Sleeping for {SLEEP_INTERVAL} second(s)...")
            time.sleep(SLEEP_INTERVAL)

    session.close()
    print("Station info table population completed.")

if __name__ == "__main__":
    populate_station_info()