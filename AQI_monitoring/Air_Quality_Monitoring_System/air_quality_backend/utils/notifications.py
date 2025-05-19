# notifications/utils.py
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from ..models import UserPreference, Measurement, Notification, Station
from ..schemas import NotificationType

class DefaultSafetyLimits:
    PM25 = 35.0  # µg/m³
    PM10 = 50.0
    NO2 = 40.0
    CO = 4.0  # ppm
    SO2 = 20.0
    OZONE = 50.0
    AQI = 100

async def check_measurement_thresholds(
        db: Session,
        measurement: Measurement,
        station: Station
):
    """Check measurement against all user preferences and send notifications if updated"""
    try:
        preferences = db.query(UserPreference).filter(
            UserPreference.station_id == station.station_id
        ).all()

        aqi_val = measurement.aqi or 0
        aqi_category = (
            "good" if aqi_val <= 50 else
            "moderate" if aqi_val <= 100 else
            "unhealthy_sensitive" if aqi_val <= 150 else
            "unhealthy" if aqi_val <= 200 else
            "very_unhealthy" if aqi_val <= 300 else
            "hazardous"
        )

        # Ensure time1 and timestamp are timezone-aware
        time1 = measurement.time1
        timestamp = measurement.timestamp
        if time1 and time1.tzinfo is None:
            time1 = time1.replace(tzinfo=timezone.utc)
        if timestamp and timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        # Determine if this is a new or updated measurement
        is_new_or_updated = time1 is None or (timestamp > time1)

        if not is_new_or_updated:
            return

        for pref in preferences:
            message_parts = []
            thresholds = {
                'pm25': pref.pm25 or DefaultSafetyLimits.PM25,
                'pm10': pref.pm10 or DefaultSafetyLimits.PM10,
                'no2': pref.no2 or DefaultSafetyLimits.NO2,
                'co': pref.co or DefaultSafetyLimits.CO,
                'so2': pref.so2 or DefaultSafetyLimits.SO2,
                'ozone': pref.ozone or DefaultSafetyLimits.OZONE,
                'aqi': pref.aqi or DefaultSafetyLimits.AQI
            }

            for param, limit in thresholds.items():
                current_value = getattr(measurement, param)
                if current_value and current_value > limit:
                    message_parts.append(
                        f"{param.upper()} exceeded ({current_value} > {limit})"
                    )

            if message_parts:
                notification = Notification(
                    user_id=pref.user_id,
                    notification_type=NotificationType.threshold_alert,
                    title=f"Air Quality Alert - {station.station_name}",
                    message="; ".join(message_parts),
                    station_id=station.station_id,
                    aqi_value=measurement.aqi,
                    aqi_category=aqi_category,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(notification)

        db.commit()

    except Exception as e:
        db.rollback()
        raise

async def cleanup_old_notifications(db: Session):
    """Keep notifications for 30 days only"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    db.query(Notification).filter(
        Notification.created_at < cutoff
    ).delete()
    db.commit()