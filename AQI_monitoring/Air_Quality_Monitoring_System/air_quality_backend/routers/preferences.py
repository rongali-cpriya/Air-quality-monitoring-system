from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import joinedload
from ..database import get_db
from ..models import UserPreference, User, Station
from ..schemas import (
    UserPreferenceCreate,
    UserPreferenceUpdate,
    UserPreferenceResponse
)
from ..utils.auth import get_current_active_user

router = APIRouter(prefix="/preferences", tags=["Preferences"])


async def get_user_preference_or_404(
        preference_id: int,
        db: Session,
        current_user: User
):
    preference = db.query(UserPreference).filter(
        UserPreference.preference_id == preference_id,
        UserPreference.user_id == current_user.user_id  # type: ignore
    ).first()

    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preference not found"
        )
    return preference


@router.post("/", response_model=UserPreferenceResponse, status_code=201)
async def create_preference(
    preference_data: UserPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    station = db.query(Station).get(preference_data.station_id)
    if not station:
        raise HTTPException(status_code=400, detail="Invalid station ID")

    existing = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.user_id,
        UserPreference.station_id == preference_data.station_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Preference already exists for this station")

    # Set default values if not provided
    defaults = {
        "aqi": 150,
        "pm25": 100,
        "pm10": 150,
        "ozone": 120,
        "no2": 80,
        "so2": 75,
        "co": 10
    }
    preference_dict = preference_data.model_dump()
    for key, value in defaults.items():
        if preference_dict.get(key) is None:
            preference_dict[key] = value

    new_preference = UserPreference(
        **preference_dict,
        user_id=current_user.user_id
    )

    db.add(new_preference)
    db.commit()
    db.refresh(new_preference)
    new_preference = db.query(UserPreference).options(
        joinedload(UserPreference.station)
    ).filter(
        UserPreference.preference_id == new_preference.preference_id
    ).first()

    return new_preference


@router.get("/", response_model=List[UserPreferenceResponse])
async def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(UserPreference).options(
        joinedload(UserPreference.station)
    ).filter(
        UserPreference.user_id == current_user.user_id  # type: ignore
    ).all()


@router.patch("/{preference_id}", response_model=UserPreferenceResponse)
async def update_preference(
        preference_id: int,
        update_data: UserPreferenceUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    preference = await get_user_preference_or_404(preference_id, db, current_user)

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(preference, field, value)

    preference.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(preference)
    return preference


@router.delete("/{preference_id}", status_code=204)
async def delete_preference(
        preference_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    preference = await get_user_preference_or_404(preference_id, db, current_user)
    db.delete(preference)
    db.commit()
