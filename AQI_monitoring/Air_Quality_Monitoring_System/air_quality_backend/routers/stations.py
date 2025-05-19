from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone
from typing import List, Optional
from ..database import get_db
from ..models import Station, User, UserRole
from ..schemas import (
    StationCreate,
    StationResponse,
    StationUpdate
)
from ..utils.auth import get_current_active_user

router = APIRouter(prefix="/stations", tags=["Stations"])


# -------------------------
# Helper Functions
# -------------------------

async def verify_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def calculate_bounding_box(lat: float, lon: float, radius_km: float):
    """Calculate approximate bounding box for geo queries"""
    # 1 degree ≈ 111km
    delta = radius_km / 111
    return (
        lat - delta,
        lat + delta,
        lon - delta,
        lon + delta
    )


# -------------------------
# Endpoints
# -------------------------

@router.post(
    "/",
    response_model=StationResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_station(
        station_data: StationCreate,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):

    if not (-90 <= station_data.latitude <= 90) or not (-180 <= station_data.longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid coordinates"
        )

    new_station = Station(**station_data.model_dump())
    db.add(new_station)
    db.commit()
    db.refresh(new_station)
    return new_station


@router.get("/", response_model=List[StationResponse])
async def get_stations(
        db: Session = Depends(get_db),
        active_only: bool = Query(True),
        source: Optional[str] = Query(None),
        limit: int = Query(10000, le=50000),
        offset: int = 0
):
    query = db.query(Station).options(joinedload(Station.measurements))

    if active_only:
        query = query.filter(Station.is_active)

    if source:
        query = query.filter(Station.source.ilike(f"%{source}%"))

    return query.order_by(Station.station_name).limit(limit).offset(offset).all()


@router.get("/{station_id}", response_model=StationResponse)
async def get_station(
        station_id: int,
        db: Session = Depends(get_db)
):
    """Get detailed station information"""
    station = db.query(Station).options(
        joinedload(Station.location),
        joinedload(Station.measurements)  # Now valid after model update
    ).filter(Station.station_id == station_id).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )
    return station


@router.get("/nearby/", response_model=List[StationResponse])
async def get_nearby_stations(
        db: Session = Depends(get_db),
        lat: float = Query(...),
        lon: float = Query(...),
        radius_km: float = Query(10, ge=1, le=100),
        limit: int = Query(50, le=200)
):
    min_lat, max_lat, min_lon, max_lon = calculate_bounding_box(lat, lon, radius_km)

    stations = db.query(Station).filter(
        Station.latitude.between(min_lat, max_lat),
        Station.longitude.between(min_lon, max_lon),
        Station.is_active
    ).options(joinedload(Station.measurements)).limit(limit).all()

    return stations


@router.patch("/{station_id}", response_model=StationResponse)
async def update_station(
        station_id: int,
        station_data: StationUpdate,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    """Update station details (Admin only)"""
    station = db.query(Station).get(station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    # Exclude unset values and location_id from update
    update_data = station_data.model_dump(exclude_unset=True, exclude={"location_id"})

    for field, value in update_data.items():
        setattr(station, field, value)

    station.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(station)
    return station


@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_station(
        station_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    """Delete station (Admin only)"""
    station = db.query(Station).get(station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    db.delete(station)
    db.commit()
