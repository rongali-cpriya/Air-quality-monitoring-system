from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from enum import Enum


class EnvironmentType(str, Enum):
    development = "development"
    production = "production"
    testing = "testing"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ENVIRONMENT: EnvironmentType = EnvironmentType.development
    VERSION: str = "1.0.0"

    # Explicit path to .env file
    model_config = SettingsConfigDict(
        env_file=r"C:\Users\satya\OneDrive\Documents\softwareeng\AQI_monitoring\Air_Quality_Monitoring_System\.env",
        env_file_encoding="utf-8"
    )


settings = Settings()
