from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from ..database import get_db
from ..models import User, UserRole
from ..schemas import UserCreate, UserUpdate, UserResponse
from ..utils.auth import get_current_active_user, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])


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


async def verify_admin_or_self(
        user_id: int,
        current_user: User = Depends(get_current_active_user)
):
    if current_user.role != UserRole.admin and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    return current_user


# -------------------------
# Endpoints
# -------------------------

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    """Get all users (Admin only)"""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
        current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
        user_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    """Get specific user by ID (Admin only)"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/",
             response_model=UserResponse,
             status_code=status.HTTP_201_CREATED)
async def create_user(
        user_data: UserCreate,
        db: Session = Depends(get_db),
        _: User = Depends(verify_admin)
):
    """Create new user (Admin only)"""
    existing_user = db.query(User).filter(
        (User.email == user_data.email) |
        (User.username == user_data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        **user_data.model_dump(exclude={"password"}),
        password_hash=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
        user_id: int,
        user_data: UserUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(verify_admin_or_self)
):
    """Update user information (Admin or self)"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent non-admins from changing roles
    if current_user.role != UserRole.admin and user_data.role:
        raise HTTPException(
            status_code=403,
            detail="Only admins can change user roles"
        )

    update_data = user_data.model_dump(exclude_unset=True)

    # Handle password update
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    # Prevent email/username duplicates
    if "email" in update_data:
        existing = db.query(User).filter(
            and_(
                User.email == update_data["email"],
                User.user_id != user_id
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    if "username" in update_data:
        existing = db.query(User).filter(
            and_(
                User.username == update_data["username"],
                User.user_id != user_id
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(verify_admin)
):
    """Delete user (Admin only)"""
    if current_user.user_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Admins cannot delete themselves"
        )

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
