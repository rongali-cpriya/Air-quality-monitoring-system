from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from datetime import datetime, timezone
from ..models import PublicContribution, User, UserRole, Station, Measurement, QualitativeContribution
from ..schemas import (
    PublicContributionCreate,
    PublicContributionResponse,
    ContributionStatus,
    StatusUpdate
)
from ..utils.auth import get_current_active_user
from sqlalchemy.orm import joinedload
from ..utils.notifications import check_measurement_thresholds


router = APIRouter(prefix="/contributions", tags=["Contributions"])


async def verify_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def verify_admin_or_contributor(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.admin, UserRole.data_contributor]:
        raise HTTPException(status_code=403, detail="Admin/data contributor required")
    return current_user


@router.post(
    "/",
    response_model=PublicContributionResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_contribution(
    contribution: PublicContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin_or_contributor)
):
    # Check if this is an AQI contribution (at least one AQI field is provided)
    aqi_fields = ["pm25", "pm10", "no2", "co", "so2", "ozone", "overall_aqi"]
    is_aqi_contribution = any(getattr(contribution, field) is not None for field in aqi_fields)

    # Require station_id for AQI contributions
    if is_aqi_contribution and contribution.station_id is None:
        raise HTTPException(
            status_code=400,
            detail="Station ID is required for AQI contributions"
        )

    # Validate station exists if station_id is provided
    if contribution.station_id is not None:
        station = db.query(Station).get(contribution.station_id)
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")

    # Validate numeric fields
    numeric_fields = ["pm25", "pm10", "no2", "co", "so2", "ozone", "overall_aqi"]
    for field in numeric_fields:
        value = getattr(contribution, field)
        if value is not None and not isinstance(value, (int, float)):
            raise HTTPException(
                status_code=400,
                detail=f"{field} must be a number, got {type(value).__name__}"
            )

    # Create new contribution
    new_contribution = PublicContribution(
        **contribution.model_dump(),  # Includes additional_info from the schema
        user_id=current_user.user_id,
        status=ContributionStatus.pending
    )

    db.add(new_contribution)
    db.commit()
    db.refresh(new_contribution)
    return new_contribution

@router.get("/", response_model=List[PublicContributionResponse])
async def get_contributions(
        db: Session = Depends(get_db),
        status_filter: Optional[ContributionStatus] = None,
        limit: int = 100,
        offset: int = 0,
        current_user: User = Depends(verify_admin_or_contributor)  # Restrict to data_contributors
):
    # Use joinedload to fetch related user and station data
    query = db.query(PublicContribution).options(
        joinedload(PublicContribution.user),
        joinedload(PublicContribution.station)
    )

    if status_filter:
        query = query.filter(PublicContribution.status == status_filter)

    contributions = query.order_by(PublicContribution.created_at.desc()).limit(limit).offset(offset).all()
    return contributions


@router.get("/{contribution_id}", response_model=PublicContributionResponse)
async def get_contribution_details(
        contribution_id: int,
        status_update: StatusUpdate,
        db: Session = Depends(get_db)
):
    contribution = db.query(PublicContribution).get(contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
    contribution.status = status_update.new_status
    db.commit()
    db.refresh(contribution)
    return contribution


@router.patch("/{contribution_id}", response_model=PublicContributionResponse)
async def update_contribution_status(
    contribution_id: int,
    new_status: ContributionStatus = Body(...),
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin)
):
    contribution = db.query(PublicContribution).get(contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    contribution.status = new_status

    if new_status == ContributionStatus.approved:
        aqi_fields = ["pm25", "pm10", "no2", "co", "so2", "ozone", "overall_aqi"]
        has_numerical_data = any(getattr(contribution, field) is not None for field in aqi_fields)

        if has_numerical_data:
            measurement = db.query(Measurement).filter(Measurement.station_id == contribution.station_id).first()
            current_time = datetime.now(timezone.utc)

            measurement_data = {
                "pm25": contribution.pm25,
                "pm10": contribution.pm10,
                "no2": contribution.no2,
                "co": contribution.co,
                "so2": contribution.so2,
                "ozone": contribution.ozone,
                "aqi": contribution.overall_aqi,
                "source": contribution.user.username if contribution.user else "unknown",
            }

            if measurement:
                measurement_data["time1"] = measurement.timestamp
                measurement_data["timestamp"] = current_time
                for key, value in measurement_data.items():
                    setattr(measurement, key, value)
            else:
                measurement = Measurement(
                    station_id=contribution.station_id,
                    time1=None,
                    timestamp=current_time,
                    **measurement_data
                )
                db.add(measurement)

            station = db.query(Station).get(contribution.station_id)
            if station:
                await check_measurement_thresholds(db, measurement, station)

        if contribution.additional_info:
            qualitative = QualitativeContribution(
                contribution_id=contribution.contribution_id,
                station_id=contribution.station_id,
                additional_info=contribution.additional_info,
                source=contribution.source,
                created_at=datetime.now(timezone.utc)
            )
            db.add(qualitative)

    db.commit()
    db.refresh(contribution)
    return contribution


@router.delete("/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(
        contribution_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    contribution = db.query(PublicContribution).get(contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    db.delete(contribution)
    db.commit()
