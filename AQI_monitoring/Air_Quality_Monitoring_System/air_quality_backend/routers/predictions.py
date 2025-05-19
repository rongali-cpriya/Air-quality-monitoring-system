from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import joblib
import os
import numpy as np
import json
from ..database import get_db
from ..models import Prediction, Station, Measurement

router = APIRouter(prefix="/predictions", tags=["Predictions"])
MODELS_DIR = os.path.join(os.path.dirname(__file__), '../utils/models')

# Mapping from database pollutant names to model file names
pollutant_mapping = {
    'pm25': 'PM2.5',
    'pm10': 'PM10',
    'no2': 'NO2',
    'ozone': 'O3',
    'co': 'CO',
    'so2': 'SO2',
    'aqi': 'AQI'
}

# -------------------------
# Prediction Logic
# -------------------------

def load_model(nearby_station_name: str, pollutant: str):
    """Load a model for a given nearby station and pollutant."""
    mapped_pollutant = pollutant_mapping.get(pollutant, pollutant)
    model_path = os.path.join(MODELS_DIR, f"{nearby_station_name}_{mapped_pollutant}_model.pkl")
    if not os.path.exists(model_path):
        return None
    return joblib.load(model_path)

def forecast_48_hours(current_values: dict, starting_timestamp: datetime, models: dict):
    pollutants = ['pm25', 'pm10', 'no2', 'ozone', 'co', 'so2']
    forecast = {p: [] for p in pollutants + ['aqi']}
    
    # Initialize current pollutants, replacing None with 0
    current_pollutants = {p: current_values[p] if current_values[p] is not None else 0 for p in pollutants}
    
    current_time = starting_timestamp
    
    for _ in range(48):
        # Calculate temporal features for the current time (used to predict the next hour)
        hour = current_time.hour  # 0-23
        dayofweek = current_time.weekday()  # 0 (Monday) to 6 (Sunday)
        
        # Create input features in the order expected by the model
        input_features = [
            current_pollutants['pm25'],   # PM2.5
            current_pollutants['pm10'],   # PM10
            current_pollutants['no2'],    # NO2
            current_pollutants['ozone'],  # O3
            current_pollutants['co'],     # CO
            current_pollutants['so2'],    # SO2
            hour,
            dayofweek
        ]
        # For debugging, uncomment the following line
        # print(f"Input features at {current_time}: {input_features} (length: {len(input_features)})")
        
        # Predict next hour's values
        next_pollutants = {}
        for pollutant in pollutants:
            if pollutant in models and models[pollutant]:
                pred = models[pollutant].predict([input_features])[0]
                next_pollutants[pollutant] = max(0, round(float(pred), 2))
                forecast[pollutant].append(next_pollutants[pollutant])
            else:
                # If model is unavailable, carry over the current value
                next_pollutants[pollutant] = current_pollutants[pollutant]
                forecast[pollutant].append(current_pollutants[pollutant])
        
        if 'aqi' in models and models['aqi']:
            aqi_pred = models['aqi'].predict([input_features])[0]
            forecast['aqi'].append(max(0, round(int(aqi_pred))))
        else:
            # If AQI model is unavailable, append None (adjust based on schema if needed)
            forecast['aqi'].append(None)
        
        # Update current pollutants for the next iteration
        current_pollutants = next_pollutants
        
        # Increment time by one hour
        current_time += timedelta(hours=1)
    
    return forecast
def generate_predictions(db: Session):
    predictions = db.query(Prediction).all()
    
    for prediction in predictions:
        station_id = prediction.station_id
        nearby_station_name = prediction.nearby_station
        
        recent_measurement = db.query(Measurement).filter(
            Measurement.station_id == station_id
        ).order_by(Measurement.timestamp.desc()).first()
        
        if not recent_measurement:
            print(f"No recent measurement for station {station_id}")
            continue
        
        current_values = {
            'pm25': recent_measurement.pm25,
            'pm10': recent_measurement.pm10,
            'no2': recent_measurement.no2,
            'co': recent_measurement.co,
            'so2': recent_measurement.so2,
            'ozone': recent_measurement.ozone
        }
        
        models = {p: load_model(nearby_station_name, p) for p in ['pm25', 'pm10', 'no2', 'co', 'so2', 'ozone', 'aqi']}
        if not any(models.values()):
            print(f"No models loaded for station {nearby_station_name}")
            continue
        
        try:
            # Pass the starting timestamp to forecast_48_hours
            forecast = forecast_48_hours(current_values, recent_measurement.timestamp, models)
            # Assign lists directly, no json.dumps
            prediction.pm25_predicted = forecast['pm25']
            prediction.pm10_predicted = forecast['pm10']
            prediction.no2_predicted = forecast['no2']
            prediction.co_predicted = forecast['co']
            prediction.so2_predicted = forecast['so2']
            prediction.ozone_predicted = forecast['ozone']
            prediction.aqi_predicted = forecast['aqi']
            prediction.prediction_time = datetime.now(timezone.utc) + timedelta(hours=48)
            prediction.created_at = datetime.now(timezone.utc)
        except Exception as e:
            print(f"Prediction failed for station {station_id}: {e}")
            continue
    
    db.commit()
    print("✅ Predictions generated successfully")
# -------------------------
# Endpoints
# -------------------------

@router.get("/{station_id}")
async def get_predictions(station_id: int, db: Session = Depends(get_db)):
    """Retrieve predictions for a specific station_id."""
    prediction = db.query(Prediction).filter(
        Prediction.station_id == station_id
    ).first()
    
    if not prediction:
        raise HTTPException(404, "No prediction found for this station")
    
    return prediction
