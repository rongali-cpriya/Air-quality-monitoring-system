from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base  # Adjusted import assuming `database.py` is in the same directory

class FactsAqi(Base):
    __tablename__ = "factsaqi"
    id = Column(Integer, primary_key=True, index=True)
    fact = Column(String, nullable=False)

class StationInfo(Base):
    __tablename__ = "stations"
    station_id = Column(Integer, primary_key=True, index=True)
    station_name = Column(String(100), nullable=False)
    latitude = Column(DECIMAL(10, 7), nullable=False)
    longitude = Column(DECIMAL(10, 7), nullable=False)
    epa_name = Column(String(100))
    epa_link = Column(String(255))
    is_active = Column(Integer, default=True)  # Changed Boolean to Integer for broader DB compatibility
    source = Column(String(50), nullable=False)
    last_updated = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    measurements = relationship("TSPAQI", back_populates="station")

class TSPAQI(Base):
    __tablename__ = "measurements"

    measurement_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id"), unique=True, nullable=False)
    time1 = Column(DateTime(timezone=True), nullable=True)  # Previous update time, timezone-aware
    timestamp = Column(DateTime(timezone=True), server_default=func.now())  # Current update time

    pm25 = Column(DECIMAL(5, 2))
    pm10 = Column(DECIMAL(5, 2))
    no2 = Column(DECIMAL(5, 2))
    co = Column(DECIMAL(5, 2))
    so2 = Column(DECIMAL(5, 2))
    ozone = Column(DECIMAL(5, 2))
    aqi = Column(Integer)
    source = Column(String(50), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    station = relationship("StationInfo", back_populates="measurements")
    __table_args__ = (UniqueConstraint('station_id', 'timestamp', name='uix_station_timestamp'),)