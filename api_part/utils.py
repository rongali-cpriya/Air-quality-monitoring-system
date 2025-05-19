import aiohttp
from datetime import datetime
from models import TSPAQI
from sqlalchemy.orm import Session

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

from sqlalchemy.orm import Session
from datetime import datetime
from models import TSPAQI  # Replace with your actual model name if different

def store_aqi_data(data, db: Session):
    """Store AQI data in the database by updating existing records or adding new ones."""
    try:
        # Extract station ID and timestamp from the data
        station_id = int(data["idx"])
        timestamp_str = data["time"]["s"]
        timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        aqi = data.get("aqi", "N/A")
        iaqi = data.get("iaqi", {})

        # Helper function to convert "N/A" to None and numeric strings to float
        def convert_value(value):
            if value == "N/A" or value is None:
                return None
            try:
                return float(value)
            except (ValueError, TypeError):
                return None

        # Extract and convert pollutant values from iaqi dictionary
        pm25 = convert_value(iaqi.get("pm25", {}).get("v", "N/A"))
        pm10 = convert_value(iaqi.get("pm10", {}).get("v", "N/A"))
        no2 = convert_value(iaqi.get("no2", {}).get("v", "N/A"))
        co = convert_value(iaqi.get("co", {}).get("v", "N/A"))
        so2 = convert_value(iaqi.get("so2", {}).get("v", "N/A"))
        ozone = convert_value(iaqi.get("o3", {}).get("v", "N/A"))
        aqi = convert_value(aqi) if aqi != "N/A" else None

        # Check if there’s an existing entry for this station
        existing_entry = db.query(TSPAQI).filter(TSPAQI.station_id == station_id).first()

        if existing_entry:
            # Move current timestamp to time1 and update with new timestamp
            existing_entry.time1 = existing_entry.timestamp
            existing_entry.timestamp = timestamp
            existing_entry.pm25 = pm25
            existing_entry.pm10 = pm10
            existing_entry.no2 = no2
            existing_entry.co = co
            existing_entry.so2 = so2
            existing_entry.ozone = ozone
            existing_entry.aqi = aqi
            print(f"✅ Updated AQI data for station {station_id} at {timestamp}")
        else:
            # Insert new record with preprocessed values
            new_data = TSPAQI(
                station_id=station_id,
                timestamp=timestamp,
                time1=None,  # Initialize time1 as NULL
                pm25=pm25,
                pm10=pm10,
                no2=no2,
                co=co,
                so2=so2,
                ozone=ozone,
                aqi=aqi,
                source="your_source_here"  # Replace with actual source or ensure default exists
            )
            db.add(new_data)
            print(f"🆕 Added new AQI data for station {station_id} at {timestamp}")

        # Commit the transaction
        db.commit()

    except Exception as e:
        print(f"❌ Error storing data for station {station_id}: {e}")
        db.rollback()