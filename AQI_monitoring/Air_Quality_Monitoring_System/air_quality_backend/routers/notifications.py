from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional

from ..database import get_db
from ..models import Notification, User, Station, UserRole
from ..schemas import NotificationResponse, NotificationCreate
from ..utils.auth import get_current_active_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


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


# -------------------------
# Endpoints
# -------------------------

@router.get("/", response_model=List[NotificationResponse])
async def get_user_notifications(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user),
        is_read: Optional[bool] = None,
        limit: int = Query(100, le=500),
        offset: int = 0
):
    """Get notifications for current user"""
    query = db.query(Notification).filter(
        Notification.user_id == current_user.user_id  # type: ignore
    )

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    return query.order_by(Notification.created_at.desc()).limit(limit).offset(offset).all()


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
        notification_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """Get specific notification"""
    notification = db.query(Notification).filter(
        and_(
            Notification.notification_id == notification_id,
        )
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
        notification_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """Mark notification as read"""
    notification = db.query(Notification).filter(
        and_(
            Notification.notification_id == notification_id,
            Notification.user_id == current_user.user_id
        )
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin)
):
    """Send notification to users (Admin only)"""
    # Validate station exists if provided
    if notification_data.station_id:
        station = db.query(Station).get(notification_data.station_id)
        if not station:
            raise HTTPException(status_code=400, detail="Invalid station ID")

    # Send to all users if no specific IDs provided
    if not notification_data.user_ids:
        users = db.query(User).filter(User.is_active).all()
        notification_data.user_ids = [user.user_id for user in users]

    notifications = []
    for user_id in notification_data.user_ids:
        user = db.query(User).get(user_id)
        if not user:
            continue  # Skip invalid users

        notification = Notification(
            **notification_data.model_dump(exclude={"user_ids"}),
            user_id=user_id,
            created_at=datetime.now(timezone.utc)
        )
        notifications.append(notification)

    db.bulk_save_objects(notifications)
    db.commit()

    return {"message": f"Notifications sent to {len(notifications)} users"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin)
):
    """Delete notification (Admin only)"""
    notification = db.query(Notification).get(notification_id)

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
