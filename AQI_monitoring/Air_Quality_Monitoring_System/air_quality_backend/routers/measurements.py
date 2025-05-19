from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from ..database import get_db
from ..models import Measurement, Station, User, UserRole
from ..schemas import MeasurementCreate, MeasurementResponse
from ..utils.auth import get_current_active_user
from ..utils.notifications import check_measurement_thresholds
import logging
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/measurements", tags=["Measurements"])

async def verify_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def calculate_bounding_box(lat: float, lon: float, radius_km: float):
    """Approximate bounding box for nearby stations"""
    delta = radius_km / 111  # 1 degree ≈ 111km
    return (
        lat - delta,
        lat + delta,
        lon - delta,
        lon + delta
    )

@router.post("/", response_model=MeasurementResponse, status_code=201)
async def create_measurement(
        measurement: MeasurementCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    try:
        station = db.query(Station).get(measurement.station_id)
        if not station:
            raise HTTPException(404, "Station not found")

        current_time = datetime.now(timezone.utc)

        existing_measurement = db.query(Measurement).filter(Measurement.station_id == measurement.station_id).first()

        if existing_measurement:
            existing_measurement.pm25 = measurement.pm25
            existing_measurement.pm10 = measurement.pm10
            existing_measurement.no2 = measurement.no2
            existing_measurement.co = measurement.co
            existing_measurement.so2 = measurement.so2
            existing_measurement.ozone = measurement.ozone
            existing_measurement.aqi = measurement.aqi
            existing_measurement.source = measurement.source
            existing_measurement.time1 = existing_measurement.timestamp
            existing_measurement.timestamp = current_time
            db.commit()
            db.refresh(existing_measurement)
            new_measurement = existing_measurement
        else:
            new_measurement = Measurement(
                station_id=measurement.station_id,
                pm25=measurement.pm25,
                pm10=measurement.pm10,
                no2=measurement.no2,
                co=measurement.co,
                so2=measurement.so2,
                ozone=measurement.ozone,
                aqi=measurement.aqi,
                source=measurement.source,
                time1=None,
                timestamp=current_time
            )
            db.add(new_measurement)
            db.commit()
            db.refresh(new_measurement)

        background_tasks.add_task(
            check_measurement_thresholds,
            db,
            new_measurement,
            station
        )

        return new_measurement
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

@router.get("/", response_model=List[MeasurementResponse])
async def get_measurements(
        db: Session = Depends(get_db),
        station_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
):
    query = db.query(Measurement).options(joinedload(Measurement.station))

    if station_id:
        query = query.filter(Measurement.station_id == station_id)

    if start_time:
        query = query.filter(Measurement.timestamp >= start_time)

    if end_time:
        query = query.filter(Measurement.timestamp <= end_time)

    return query.order_by(Measurement.timestamp.desc()).limit(limit).offset(offset).all()

@router.get("/{measurement_id}", response_model=MeasurementResponse)
async def get_measurement(
        measurement_id: int,
        db: Session = Depends(get_db)
):
    measurement = db.query(Measurement).get(measurement_id)
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return measurement

@router.get("/nearby/", response_model=List[MeasurementResponse])
async def get_nearby_measurements(
        db: Session = Depends(get_db),
        lat: float = Query(..., description="Center latitude"),
        lon: float = Query(..., description="Center longitude"),
        radius_km: float = Query(10, description="Search radius in kilometers"),
        hours: int = Query(24, description="Hours of historical data to retrieve"),
        limit: int = 100
):
    min_lat, max_lat, min_lon, max_lon = calculate_bounding_box(lat, lon, radius_km)

    time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)

    measurements = db.query(Measurement).join(Station).filter(
        Station.latitude.between(min_lat, max_lat),
        Station.longitude.between(min_lon, max_lon),
        Measurement.timestamp >= time_threshold
    ).order_by(Measurement.timestamp.desc()).limit(limit).all()

    return measurements

@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(
        measurement_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    measurement = db.query(Measurement).get(measurement_id)
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")

    db.delete(measurement)
    db.commit()