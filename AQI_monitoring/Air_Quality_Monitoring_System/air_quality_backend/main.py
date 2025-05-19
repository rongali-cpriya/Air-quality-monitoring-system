from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from starlette.middleware.cors import CORSMiddleware
from .utils.notifications import cleanup_old_notifications
from .database import SessionLocal
from .routers import (
    auth,
    users,
    stations,
    measurements,
    contributions,
    notifications,
    forum,
    preferences,
    predictions,
    feedback
)
from .config import settings
from .routers.predictions import generate_predictions

app = FastAPI(
    title="Air Quality Monitoring System API",
    description="API for real-time air quality monitoring and analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for feedback uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stations.router)
app.include_router(measurements.router)
app.include_router(contributions.router)
app.include_router(notifications.router)
app.include_router(forum.router)
app.include_router(preferences.router)
app.include_router(predictions.router)
app.include_router(feedback.router)

@app.on_event("startup")
async def startup_event():
    """Initialize application services on startup"""
    print(f"🚀 Starting Air Quality API version {settings.VERSION}")
    print(f"💾 Database: {settings.DATABASE_URL}")

def scheduled_cleanup():
    """Daily maintenance tasks"""
    with SessionLocal() as db:
        try:
            print("🔄 Running scheduled cleanup...")
            cleanup_old_notifications(db)
            print("✅ Cleanup completed successfully")
        except Exception as e:
            print(f"❌ Cleanup failed: {str(e)}")
        finally:
            db.close()

def scheduled_predictions():
    """Generate predictions every 30 minutes"""
    with SessionLocal() as db:
        try:
            print("🔮 Generating predictions...")
            generate_predictions(db)
            print("✅ Predictions generated successfully")
        except Exception as e:
            print(f"❌ Prediction generation failed: {str(e)}")
        finally:
            db.close()

@app.on_event("startup")
def init_scheduler_and_run_predictions():
    """Initialize scheduler and conditionally run predictions on startup"""
    scheduler = BackgroundScheduler()
    
    # Daily cleanup at 3 AM UTC
    scheduler.add_job(
        scheduled_cleanup,
        'cron',
        hour=3,
        minute=0,
        timezone="UTC"
    )
    
    # Predictions every 30 minutes
    scheduler.add_job(
        scheduled_predictions,
        'interval',
        minutes=30,
        timezone="UTC"
    )
    
    scheduler.start()
    print("⏰ Scheduled tasks initialized (cleanup & predictions)")

    print("🔮 Running initial predictions on startup...")
    with SessionLocal() as db:
        try:
            generate_predictions(db)
            print("✅ Initial predictions generated successfully")
        except Exception as e:
            print(f"❌ Initial prediction generation failed: {str(e)}")
        finally:
            db.close()

@app.get("/health", tags=["System"])
async def health_check():
    """Endpoint for service health monitoring"""
    return {
        "status": "OK",
        "version": settings.VERSION,
        "database": "active" if SessionLocal().execute("SELECT 1").scalar() else "inactive",
        "services": {
            "predictions": "active",
            "notifications": "active"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "air_quality_backend.main:app",
        host="127.0.0.1",
        port=8002,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )