from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from geopy.distance import geodesic
import pandas as pd
import os
import csv
from datetime import datetime
import sys
import time

# Add parent directory to path to allow direct imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Direct imports to avoid circular dependencies
from air_quality_backend.models import Base, Station, Prediction
from air_quality_backend.database import engine

# Create database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_nearest_station(lat, lon, stations_df):
    """Find the nearest station from stations.csv for the given coordinates"""
    if pd.isna(lat) or pd.isna(lon):
        return None
    
    min_distance = float('inf')
    nearest_station_id = None
    
    for _, row in stations_df.iterrows():
        station_lat = row['Latitude']
        station_lon = row['Longitude']
        
        if pd.isna(station_lat) or pd.isna(station_lon):
            continue
        
        distance = geodesic((lat, lon), (station_lat, station_lon)).kilometers
        
        if distance < min_distance:
            min_distance = distance
            nearest_station_id = row['StationId']
    
    return nearest_station_id

def fill_predictions_table():
    db = SessionLocal()
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Navigate to the correct CSV path
        csv_path = os.path.join(script_dir, 'filtered_stations.csv')
        if not os.path.exists(csv_path):
            # Try looking in parent directory
            csv_path = os.path.join(parent_dir, 'filtered_stations.csv')
        
        # Debug print to find where the script is looking
        print(f"Looking for filtered_stations.csv at: {csv_path}")
        
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"filtered_stations.csv not found at {csv_path}")
        
        stations_df = pd.read_csv(csv_path)
        
        # Get all stations from the stations table
        all_stations = db.query(
            Station.station_id, 
            Station.station_name,
            Station.latitude,
            Station.longitude
        ).all()
        
        # Print count of stations found for debugging
        print(f"Found {len(all_stations)} stations in database")
        
        # List to store station_ids for India
        india_station_ids = []
        
        # Filter stations in India and find nearest stations
        for station in all_stations:
            station_name = station.station_name
            
            # Check if the station is in India by parsing the station name
            if station_name:
                parts = [part.strip().lower() for part in station_name.split(',')]
                country = parts[-1].strip() if parts else ""
                
                if country in ["india", "india ", " india"]:
                    station_id = station.station_id
                    lat = float(station.latitude) if station.latitude else None
                    lon = float(station.longitude) if station.longitude else None
                    
                    # Find nearest station from filtered_stations.csv
                    nearest_station_id = get_nearest_station(lat, lon, stations_df)
                    
                    # Add to the list
                    india_station_ids.append({
                        'station_id': station_id,
                        'nearest_station_id': nearest_station_id
                    })
        
        print(f"Found {len(india_station_ids)} Indian stations")
        
        # Insert records in smaller batches to avoid bulk insert issues
        batch_size = 10
        total_inserted = 0
        
        for i in range(0, len(india_station_ids), batch_size):
            batch = india_station_ids[i:i + batch_size]
            inserted_in_batch = 0
            
            for station_data in batch:
                # Check if the prediction for this station already exists
                existing_prediction = db.query(Prediction).filter(
                    Prediction.station_id == station_data['station_id']
                ).first()
                
                if not existing_prediction:
                    # Create a new prediction object (prediction_id will be auto-generated)
                    new_prediction = Prediction(
                        station_id=station_data['station_id'],
                        nearby_station=station_data['nearest_station_id'],
                        prediction_time=datetime.now(),
                        created_at=datetime.now()  # Explicitly set created_at
                    )
                    db.add(new_prediction)
                    inserted_in_batch += 1
                else:
                    print(f"Prediction already exists for station_id {station_data['station_id']}")
            
            # Commit each batch separately
            try:
                if inserted_in_batch > 0:
                    db.commit()
                    total_inserted += inserted_in_batch
                    print(f"Batch {i // batch_size + 1}: Added {inserted_in_batch} records successfully")
                else:
                    print(f"Batch {i // batch_size + 1}: No new records to add")
            except Exception as e:
                db.rollback()
                print(f"Error in batch {i // batch_size + 1}: {str(e)}")
                raise  # Re-raise to ensure we catch the full error
            
            # Small delay between batches to ensure database has time to process
            time.sleep(0.1)
        
        print(f"Successfully added a total of {total_inserted} predictions for Indian stations.")
    
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
    
    finally:
        db.close()

if __name__ == "__main__":
    fill_predictions_table()