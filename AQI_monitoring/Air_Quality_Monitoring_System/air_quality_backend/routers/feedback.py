from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import logging

from ..database import get_db
from ..models import Feedback, User
from ..schemas import FeedbackCreate, FeedbackResponse
from ..utils.auth import get_current_active_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Feedback"])

UPLOAD_DIR = Path("uploads/feedback")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf", ".doc", ".docx"}

@router.post("/", response_model=FeedbackResponse)
async def create_feedback(
    name: str = Form(...),
    info: str = Form(...),
    stars: int = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit new feedback with optional file attachment"""
    if stars < 1 or stars > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5 stars"
        )

    file_path = None
    file_type = None
    file_size = None

    if file and file.filename:
        # Validate file size
        contents = await file.read()
        size = len(contents)
        await file.seek(0)  # Reset file position for later use

        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE/1024/1024}MB"
            )

        # Validate file extension
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Generate unique filename and save file
        timestamp = int(datetime.now().timestamp())
        filename = f"{current_user.user_id}_{timestamp}{ext}"
        file_path = str(UPLOAD_DIR / filename).replace("\\", "/")

        with open(file_path, "wb") as f:
            f.write(contents)

        file_type = ext
        file_size = size

    feedback = Feedback(
        user_id=current_user.user_id,
        name=name,
        info=info,
        stars=stars,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size
    )

    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    logger.info(f"Feedback created: ID={feedback.feedback_id}, User={current_user.user_id}")
    return feedback

@router.get("/", response_model=List[FeedbackResponse])
async def get_all_feedback(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    order_by: Optional[str] = "created_at_desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all feedback (paginated) with optional filtering and sorting"""
    logger.info(f"Fetching feedback for user_id={user_id}, order_by={order_by}, user={current_user.user_id}")
    query = db.query(Feedback)
    
    if user_id:
        query = query.filter(Feedback.user_id == user_id)
    
    if order_by == "created_at_desc":
        query = query.order_by(Feedback.created_at.desc())
    elif order_by == "created_at_asc":
        query = query.order_by(Feedback.created_at.asc())
    
    feedback = query.offset(skip).limit(limit).all()
    logger.info(f"Retrieved {len(feedback)} feedback entries")
    return feedback