from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime

# -------------------------
# Enums (Match Database Enums)
# -------------------------


class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    data_contributor = "data_contributor"


class AQICategory(str, Enum):
    good = "good"
    moderate = "moderate"
    unhealthy_sensitive = "unhealthy_sensitive"
    unhealthy = "unhealthy"
    very_unhealthy = "very_unhealthy"
    hazardous = "hazardous"


class NotificationType(str, Enum):
    threshold_alert = "threshold_alert"
    forecast_alert = "forecast_alert"
    system_update = "system_update"


class ContributionStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class StatusUpdate(BaseModel):
    new_status: ContributionStatus

# -------------------------
# Base Schemas
# -------------------------


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.user


class StationBase(BaseModel):
    station_name: str = Field(..., max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    epa_name: Optional[str] = Field(None, max_length=100)
    epa_link: Optional[str] = Field(None, max_length=255)
    is_active: bool = True
    source: str = Field(..., max_length=50)

# -------------------------
# Request Schemas (Create/Update)
# -------------------------


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "johndoe@example.com",
                "password": "strongpassword123",
                "role": "user"
            }
        }


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[UserRole] = None
    preferences: Optional[dict] = None
    is_active: Optional[bool] = None


class StationCreate(StationBase):
    pass

# -------------------------
# Response Schemas
# -------------------------


class UserResponse(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        exclude = {"password_hash"}


class StationSimpleResponse(BaseModel):
    station_id: Optional[int] = None
    station_name: str

    class Config:
        from_attributes = True


class MeasurementResponse(BaseModel):
    measurement_id: int
    station_id: int
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    co: Optional[float] = None
    so2: Optional[float] = None
    ozone: Optional[float] = None
    aqi: Optional[int] = None
    source: str
    time1: Optional[datetime] = None  # Previous update time
    timestamp: datetime  # Current update time
    created_at: datetime
    station: StationSimpleResponse

    class Config:
        from_attributes = True


class UserSimpleResponse(BaseModel):
    user_id: int
    username: str

    class Config:
        from_attributes = True


class StationResponse(StationBase):
    station_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    measurements: List[MeasurementResponse] = []

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# New Forum Schemas
class PostBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str

class PostCreate(PostBase):
    title: str
    content: str

class PostResponse(PostBase):
    post_id: int
    title: str
    content: str
    user_id: int
    username: str
    created_at: datetime
    updated_at: datetime | None
    upvotes: int
    downvotes: int

    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    post_id: int
    content: str
    parent_comment_id: Optional[int] = None

class CommentResponse(CommentBase):
    comment_id: int
    post_id: int
    user_id: int
    username: str
    upvotes: int
    downvotes: int  # Add this
    created_at: datetime
    updated_at: Optional[datetime]
    parent_comment_id: Optional[int] = None  # Add this
    user_vote: Optional[str] = None  # Add this

    class Config:
        from_attributes = True

class UserReputationResponse(BaseModel):
    user_id: int
    aura_points: int
    streak_points: int
    credibility_points: int
    last_streak_date: Optional[datetime]

    class Config:
        from_attributes = True

class ReportStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    false = "false"

class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str

class ReportResponse(BaseModel):
    report_id: int
    reporter_id: int
    reported_user_id: int
    reason: str
    status: ReportStatus
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------
# Authentication Schemas
# -------------------------


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None

# -------------------------
# Notification Schemas
# -------------------------


class NotificationBase(BaseModel):
    notification_type: NotificationType
    title: str = Field(..., max_length=100)
    message: str
    station_id: Optional[int] = None
    aqi_value: Optional[int] = None
    aqi_category: Optional[AQICategory] = None

    @field_validator("aqi_category", mode="before")
    def empty_string_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value


# ADD THIS
class NotificationCreate(NotificationBase):
    user_ids: List[int] = Field(default_factory=list)


class NotificationResponse(NotificationBase):
    notification_id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------
# Contribution Schemas
# -------------------------


class PublicContributionBase(BaseModel):
    station_id: Optional[int] = None
    pm25: Optional[float] = Field(None, ge=0)
    pm10: Optional[float] = Field(None, ge=0)
    no2: Optional[float] = Field(None, ge=0)
    co: Optional[float] = Field(None, ge=0)
    so2: Optional[float] = Field(None, ge=0)
    ozone: Optional[float] = Field(None, ge=0)
    overall_aqi: Optional[float] = Field(None, ge=0)
    source: str = Field(..., max_length=50)
    additional_info: Optional[str] = Field(None, max_length=500)

    @model_validator(mode='after')
    def validate_contribution(self):
        has_pollutants = any([
            self.pm25 is not None,
            self.pm10 is not None,
            self.no2 is not None,
            self.co is not None,
            self.so2 is not None,
            self.ozone is not None,
            self.overall_aqi is not None
        ])

        if self.additional_info:
            if not self.additional_info.strip():
                raise ValueError("Additional info cannot be empty")
        else:
            if not has_pollutants:
                raise ValueError("At least one pollutant value is required")
            if not self.station_id:
                raise ValueError("Station ID is required for numerical contributions")

        return self


class QualitativeContributionCreate(BaseModel):
    station_id: Optional[int] = None
    additional_info: str = Field(..., max_length=500)
    source: str = Field(..., max_length=50)

class PublicContributionCreate(PublicContributionBase):
    station_id: Optional[int] = None


class PublicContributionResponse(PublicContributionBase):
    contribution_id: int
    status: ContributionStatus
    created_at: datetime
    user: UserSimpleResponse  # Use simplified model
    station: Optional[StationSimpleResponse] = None # Use simplified model

    class Config:
        from_attributes = True

# -------------------------
# Measurement Schemas
# -------------------------


class MeasurementCreate(BaseModel):
    station_id: int
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    co: Optional[float] = None
    so2: Optional[float] = None
    ozone: Optional[float] = None
    aqi: Optional[int] = None
    source: str
    timestamp: Optional[datetime] = None

# -------------------------
# Station Update Schema
# -------------------------


class StationUpdate(BaseModel):
    station_name: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    epa_name: Optional[str] = Field(None, max_length=100)
    epa_link: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    source: Optional[str] = Field(None, max_length=50)

# -------------------------
# Utility Schemas
# -------------------------


class HealthCheck(BaseModel):
    status: str
    database_status: str
    environment: str
    version: str


# -------------------------
# Preference Schemas
# -------------------------

class UserPreferenceBase(BaseModel):
    station_id: int
    pm25: Optional[float] = Field(None, ge=0)
    pm10: Optional[float] = Field(None, ge=0)
    no2: Optional[float] = Field(None, ge=0)
    co: Optional[float] = Field(None, ge=0)
    so2: Optional[float] = Field(None, ge=0)
    ozone: Optional[float] = Field(None, ge=0)
    aqi: Optional[int] = Field(None, ge=0)


class UserPreferenceCreate(UserPreferenceBase):
    pass


class UserPreferenceUpdate(BaseModel):
    pm25: Optional[float] = Field(None, ge=0)
    pm10: Optional[float] = Field(None, ge=0)
    no2: Optional[float] = Field(None, ge=0)
    co: Optional[float] = Field(None, ge=0)
    so2: Optional[float] = Field(None, ge=0)
    ozone: Optional[float] = Field(None, ge=0)
    aqi: Optional[int] = Field(None, ge=0)


class UserPreferenceResponse(UserPreferenceBase):
    preference_id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    station_name: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PredictionResponse(BaseModel):
    station_id: int
    pm25_predicted: List[Optional[float]]  # List of 48 values
    pm10_predicted: List[Optional[float]]
    no2_predicted: List[Optional[float]]
    co_predicted: List[Optional[float]]
    so2_predicted: List[Optional[float]]
    ozone_predicted: List[Optional[float]]
    aqi_predicted: List[Optional[int]]  # List of 48 integers
    nearby_station: str
    prediction_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class StationSimpleResponse(BaseModel):
    station_id: int
    station_name: str

    class Config:
        from_attributes = True

class UserVotesResponse(BaseModel):
    post_votes: List[dict]  # e.g., [{"post_id": 1, "vote_type": "up"}, ...]
    comment_votes: List[dict]  # e.g., [{"comment_id": 1, "vote_type": "down"}, ...]

    class Config:
        from_attributes = True

# -------------------------
# Feedback Schemas
# -------------------------

class FeedbackBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    info: str = Field(..., min_length=1)
    stars: int = Field(..., ge=1, le=5)

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackResponse(FeedbackBase):
    feedback_id: int
    user_id: int
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True