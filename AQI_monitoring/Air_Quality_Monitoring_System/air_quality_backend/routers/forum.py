from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Post, Comment, UserReputation, Report, User, ReportStatus, UserPostVote, UserCommentVote
from datetime import datetime, timezone, timedelta
from ..schemas import (
    PostCreate, PostResponse, CommentCreate, CommentResponse, UserRole,
    UserReputationResponse, ReportCreate, ReportResponse, UserVotesResponse, StatusUpdate
)
from ..utils.auth import get_current_active_user
from ..utils.reputation import update_aura_points, update_credibility_points
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forum", tags=["Forum"])

async def verify_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# Posts
@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post: PostCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_active_user)):
    new_post = Post(**post.model_dump(), user_id=current_user.user_id)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    update_aura_points(db, current_user.user_id, action="post")
    logger.debug(f"Created post: {new_post.post_id}")
    return {**new_post.__dict__, "username": current_user.username}

@router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    sort: str = Query("new", enum=["new", "top", "trending"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Post).join(User)
    if sort == "new":
        query = query.order_by(Post.created_at.desc())
    elif sort == "top":
        query = query.order_by((Post.upvotes - Post.downvotes).desc())
    elif sort == "trending":
        query = query.filter(Post.created_at >= datetime.now(timezone.utc) - timedelta(days=1))
        query = query.order_by((Post.upvotes - Post.downvotes).desc())
    
    posts = query.all()
    posts_with_votes = []
    for post in posts:
        vote = db.query(UserPostVote).filter(
            UserPostVote.user_id == current_user.user_id,
            UserPostVote.post_id == post.post_id
        ).first()
        posts_with_votes.append({
            **post.__dict__,
            "username": post.user.username,
            "user_vote": vote.vote_type if vote else None
        })
    logger.debug(f"Fetched {len(posts_with_votes)} posts")
    return posts_with_votes

# Comments
@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    post = db.query(Post).filter(Post.post_id == comment_data.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if comment_data.parent_comment_id:
        parent = db.query(Comment).filter(Comment.comment_id == comment_data.parent_comment_id).first()
        if not parent or parent.post_id != comment_data.post_id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")

    current_time = datetime.now(timezone.utc)
    new_comment = Comment(
        post_id=comment_data.post_id,
        user_id=current_user.user_id,
        parent_comment_id=comment_data.parent_comment_id,
        content=comment_data.content,
        created_at=current_time,
        updated_at=current_time,
        upvotes=0,
        downvotes=0
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    update_aura_points(db, current_user.user_id, action="comment")
    logger.debug(f"Created comment: {new_comment.comment_id}, parent: {new_comment.parent_comment_id}")
    return {
        "comment_id": new_comment.comment_id,
        "post_id": new_comment.post_id,
        "user_id": new_comment.user_id,
        "username": current_user.username,
        "content": new_comment.content,
        "created_at": new_comment.created_at,
        "updated_at": new_comment.updated_at,
        "upvotes": new_comment.upvotes,
        "downvotes": new_comment.downvotes,
        "parent_comment_id": new_comment.parent_comment_id,
        "user_vote": None
    }

@router.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_update: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this post")
    
    post.title = post_update.title
    post.content = post_update.content
    post.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return {**post.__dict__, "username": current_user.username}

# Posts - Delete Endpoint
@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    # First, delete all comments associated with this post
    comments = db.query(Comment).filter(Comment.post_id == post_id).all()
    
    # Delete all votes associated with these comments
    for comment in comments:
        db.query(UserCommentVote).filter(UserCommentVote.comment_id == comment.comment_id).delete()
    
    # Delete all comments
    db.query(Comment).filter(Comment.post_id == post_id).delete()
    
    # Delete all votes associated with this post
    db.query(UserPostVote).filter(UserPostVote.post_id == post_id).delete()
    
    # Finally, delete the post
    db.delete(post)
    db.commit()

# Comments - Update Endpoint
@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_update: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")
    
    comment.content = comment_update.content
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    return {
        "comment_id": comment.comment_id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "username": current_user.username,
        "content": comment.content,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "upvotes": comment.upvotes,
        "downvotes": comment.downvotes,
        "parent_comment_id": comment.parent_comment_id,
        "user_vote": None  # Assuming user_vote is handled separately
    }

# Comments - Delete Endpoint
@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    db.delete(comment)
    db.commit()

@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = db.query(Comment).join(User).filter(Comment.post_id == post_id).all()
    comments_with_votes = []
    for comment in comments:
        vote = db.query(UserCommentVote).filter(
            UserCommentVote.user_id == current_user.user_id,
            UserCommentVote.comment_id == comment.comment_id
        ).first()
        comments_with_votes.append({
            "comment_id": comment.comment_id,
            "post_id": comment.post_id,
            "user_id": comment.user_id,
            "username": comment.user.username,
            "content": comment.content,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "upvotes": comment.upvotes,
            "downvotes": comment.downvotes,
            "parent_comment_id": comment.parent_comment_id,
            "user_vote": vote.vote_type if vote else None
        })
    logger.debug(f"Fetched {len(comments_with_votes)} comments for post {post_id}")
    return comments_with_votes

# Voting - Posts
@router.post("/posts/{post_id}/upvote")
async def upvote_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_vote = db.query(UserPostVote).filter(
        UserPostVote.user_id == current_user.user_id,
        UserPostVote.post_id == post_id
    ).first()

    if existing_vote:
        if existing_vote.vote_type == "up":
            db.delete(existing_vote)
            post.upvotes -= 1
            message = "Upvote removed"
            user_vote = None
        elif existing_vote.vote_type == "down":
            existing_vote.vote_type = "up"
            post.upvotes += 1
            post.downvotes -= 1
            update_aura_points(db, post.user_id, action="upvote")
            message = "Switched to upvote"
            user_vote = "up"
    else:
        new_vote = UserPostVote(user_id=current_user.user_id, post_id=post_id, vote_type="up")
        db.add(new_vote)
        post.upvotes += 1
        update_aura_points(db, post.user_id, action="upvote")
        message = "Upvoted successfully"
        user_vote = "up"

    db.commit()
    logger.debug(f"Post {post_id} upvoted: upvotes={post.upvotes}, downvotes={post.downvotes}")
    return {
        "message": message,
        "upvotes": post.upvotes,
        "downvotes": post.downvotes,
        "user_vote": user_vote
    }

@router.post("/posts/{post_id}/downvote")
async def downvote_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_vote = db.query(UserPostVote).filter(
        UserPostVote.user_id == current_user.user_id,
        UserPostVote.post_id == post_id
    ).first()

    if existing_vote:
        if existing_vote.vote_type == "down":
            db.delete(existing_vote)
            post.downvotes -= 1
            message = "Downvote removed"
            user_vote = None
        elif existing_vote.vote_type == "up":
            existing_vote.vote_type = "down"
            post.downvotes += 1
            post.upvotes -= 1
            message = "Switched to downvote"
            user_vote = "down"
    else:
        new_vote = UserPostVote(user_id=current_user.user_id, post_id=post_id, vote_type="down")
        db.add(new_vote)
        post.downvotes += 1
        message = "Downvoted successfully"
        user_vote = "down"

    db.commit()
    logger.debug(f"Post {post_id} downvoted: upvotes={post.upvotes}, downvotes={post.downvotes}")
    return {
        "message": message,
        "upvotes": post.upvotes,
        "downvotes": post.downvotes,
        "user_vote": user_vote
    }

# Voting - Comments
@router.post("/comments/{comment_id}/upvote")
async def upvote_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing_vote = db.query(UserCommentVote).filter(
        UserCommentVote.user_id == current_user.user_id,
        UserCommentVote.comment_id == comment_id
    ).first()

    if existing_vote:
        if existing_vote.vote_type == "up":
            db.delete(existing_vote)
            comment.upvotes -= 1
            message = "Upvote removed"
            user_vote = None
        elif existing_vote.vote_type == "down":
            existing_vote.vote_type = "up"
            comment.upvotes += 1
            comment.downvotes -= 1
            update_aura_points(db, comment.user_id, action="upvote")
            message = "Switched to upvote"
            user_vote = "up"
    else:
        new_vote = UserCommentVote(user_id=current_user.user_id, comment_id=comment_id, vote_type="up")
        db.add(new_vote)
        comment.upvotes += 1
        update_aura_points(db, comment.user_id, action="upvote")
        message = "Upvoted successfully"
        user_vote = "up"

    db.commit()
    logger.debug(f"Comment {comment_id} upvoted: upvotes={comment.upvotes}, downvotes={comment.downvotes}")
    return {
        "message": message,
        "upvotes": comment.upvotes,
        "downvotes": comment.downvotes,
        "user_vote": user_vote
    }

@router.post("/comments/{comment_id}/downvote")
async def downvote_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing_vote = db.query(UserCommentVote).filter(
        UserCommentVote.user_id == current_user.user_id,
        UserCommentVote.comment_id == comment_id
    ).first()

    if existing_vote:
        if existing_vote.vote_type == "down":
            db.delete(existing_vote)
            comment.downvotes -= 1
            message = "Downvote removed"
            user_vote = None
        elif existing_vote.vote_type == "up":
            existing_vote.vote_type = "down"
            comment.downvotes += 1
            comment.upvotes -= 1
            message = "Switched to downvote"
            user_vote = "down"
    else:
        new_vote = UserCommentVote(user_id=current_user.user_id, comment_id=comment_id, vote_type="down")
        db.add(new_vote)
        comment.downvotes += 1
        message = "Downvoted successfully"
        user_vote = "down"

    db.commit()
    logger.debug(f"Comment {comment_id} downvoted: upvotes={comment.upvotes}, downvotes={comment.downvotes}")
    return {
        "message": message,
        "upvotes": comment.upvotes,
        "downvotes": comment.downvotes,
        "user_vote": user_vote
    }

# User Votes
@router.get("/user/votes", response_model=UserVotesResponse)
async def get_user_votes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post_votes = db.query(UserPostVote).filter(UserPostVote.user_id == current_user.user_id).all()
    comment_votes = db.query(UserCommentVote).filter(UserCommentVote.user_id == current_user.user_id).all()
    
    post_votes_list = [{"post_id": vote.post_id, "vote_type": vote.vote_type} for vote in post_votes]
    comment_votes_list = [{"comment_id": vote.comment_id, "vote_type": vote.vote_type} for vote in comment_votes]
    
    logger.debug(f"Fetched votes for user {current_user.user_id}: {len(post_votes_list)} post votes, {len(comment_votes_list)} comment votes")
    return {
        "post_votes": post_votes_list,
        "comment_votes": comment_votes_list
    }

# Reputation
@router.get("/reputation/{user_id}", response_model=UserReputationResponse)
async def get_user_reputation(user_id: int, db: Session = Depends(get_db)):
    reputation = db.query(UserReputation).filter(UserReputation.user_id == user_id).first()
    if not reputation:
        reputation = UserReputation(
            user_id=user_id,
            aura_points=0,
            streak_points=0,
            credibility_points=100,
            last_streak_date=None
        )
        db.add(reputation)
        db.commit()
        db.refresh(reputation)
    return reputation

# Reports
@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    new_report = Report(
        reporter_id=current_user.user_id,
        reported_user_id=report.reported_user_id,
        reason=report.reason,
        status=ReportStatus.pending,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.put("/reports/{report_id}/status", response_model=ReportResponse)
async def update_report_status(
    report_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = ReportStatus(status_update.new_status.value)
    db.commit()
    db.refresh(report)
    
    update_credibility_points(db, report, report.status)
    return report