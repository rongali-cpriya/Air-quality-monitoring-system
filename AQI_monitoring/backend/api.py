from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import get_db
from .models import StationInfo, TSPAQI, FactsAqi  # Corrected model name
import math
import random

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Update if frontend URL changes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy.exc import SQLAlchemyError

@app.get("/random_fact")
def get_random_fact(db: Session = Depends(get_db)):
    try:
        facts = db.query(FactsAqi).all()
        print(f"Number of facts retrieved: {len(facts)}")
        if not facts:
            return {"fact": "Air pollution is a leading environmental health risk."}
        random_fact = random.choice(facts)
        return {"fact": random_fact.fact}
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        return {"fact": "Error retrieving fact from database."}

@app.get("/stations")
def get_stations(db: Session = Depends(get_db)):
    stations = db.query(StationInfo).all()
    response = []

    for station in stations:
        latest_aqi = (
            db.query(TSPAQI)  # Corrected model name
            .filter(TSPAQI.station_id == station.station_id)
            .order_by(TSPAQI.timestamp.desc())
            .first()
        )

        response.append({
            "station_id": station.station_id,
            "station_name": station.station_name,
            "latitude": station.latitude,
            "longitude": station.longitude,
            "aqi": latest_aqi.aqi if latest_aqi else "N/A",
            "co": latest_aqi.co if latest_aqi else "N/A",
            "no2": latest_aqi.no2 if latest_aqi else "N/A",
            "so2": latest_aqi.so2 if latest_aqi else "N/A",
            "o3": latest_aqi.ozone if latest_aqi else "N/A",  # Corrected field name
            "pm25": latest_aqi.pm25 if latest_aqi else "N/A",
            "pm10": latest_aqi.pm10 if latest_aqi else "N/A",
        })

    return response

@app.get("/station/{station_id}")
def get_station_by_id(station_id: int, db: Session = Depends(get_db)):
    station = db.query(StationInfo).filter(StationInfo.station_id == station_id).first()
    
    if not station:
        return {"error": "Station not found"}

    latest_aqi = (
        db.query(TSPAQI)  # Corrected model name
        .filter(TSPAQI.station_id == station_id)
        .order_by(TSPAQI.timestamp.desc())
        .first()
    )

    return {
        "station_id": station.station_id,
        "station_name": station.station_name,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "aqi": latest_aqi.aqi if latest_aqi else "N/A",
        "co": latest_aqi.co if latest_aqi else "N/A",
        "no2": latest_aqi.no2 if latest_aqi else "N/A",
        "so2": latest_aqi.so2 if latest_aqi else "N/A",
        "o3": latest_aqi.ozone if latest_aqi else "N/A",  # Corrected field name
        "pm25": latest_aqi.pm25 if latest_aqi else "N/A",
        "pm10": latest_aqi.pm10 if latest_aqi else "N/A",
    }

def calculate_distance(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - float(lat2)) ** 2 + (lon1 - float(lon2)) ** 2)


@app.get("/nearest_station")
def get_nearest_station(lat: float, lon: float, db: Session = Depends(get_db)):
    stations = db.query(StationInfo).all()
    if not stations:
        return {"error": "No stations available"}

    nearest = min(stations, key=lambda s: calculate_distance(lat, lon, s.latitude, s.longitude))

    latest_aqi = (
        db.query(TSPAQI)  # Corrected model name
        .filter(TSPAQI.station_id == nearest.station_id)
        .order_by(TSPAQI.timestamp.desc())
        .first()
    )

    if not latest_aqi:
        return {"error": "AQI data not available"}

    return {
        "station_id": nearest.station_id,  # ✅ Added this line
        "station_name": nearest.station_name,
        "latitude": nearest.latitude,
        "longitude": nearest.longitude,
        "aqi": latest_aqi.aqi,
        "co": latest_aqi.co,
        "no2": latest_aqi.no2,
        "so2": latest_aqi.so2,
        "o3": latest_aqi.ozone,  # Corrected field name
        "pm25": latest_aqi.pm25,
        "pm10": latest_aqi.pm10,
        "aqi_level": (
            "good" if int(latest_aqi.aqi) < 50
            else "moderate" if int(latest_aqi.aqi) < 100
            else "unhealthy"
        )
    }

@app.get("/station_by_name")
def get_station_by_name(name: str, db: Session = Depends(get_db)):
    station = db.query(StationInfo).filter(StationInfo.station_name.ilike(f"%{name}%")).first()

    if not station:
        return {"error": "Station not found"}

    latest_aqi = (
        db.query(TSPAQI)  # Corrected model name
        .filter(TSPAQI.station_id == station.station_id)
        .order_by(TSPAQI.timestamp.desc())
        .first()
    )

    return {
        "station_id": station.station_id,
        "station_name": station.station_name,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "aqi": latest_aqi.aqi if latest_aqi else "N/A",
        "co": latest_aqi.co if latest_aqi else "N/A",
        "no2": latest_aqi.no2 if latest_aqi else "N/A",
        "so2": latest_aqi.so2 if latest_aqi else "N/A",
        "o3": latest_aqi.ozone if latest_aqi else "N/A",  # Corrected field name
        "pm25": latest_aqi.pm25 if latest_aqi else "N/A",
        "pm10": latest_aqi.pm10 if latest_aqi else "N/A",
    }

@app.get("/search_stations")
def search_stations(query: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    stations = db.query(StationInfo).filter(StationInfo.station_name.ilike(f"%{query}%")).limit(10).all()
    
    return [
        {
            "id": station.station_id,
            "name": station.station_name,
            "latitude": station.latitude,
            "longitude": station.longitude
        }
        for station in stations
    ]
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("air_quality_backend.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)