import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_, and_, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.messages import Messages

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/messaging", tags=["messaging"])


# ---------- Schemas ----------
class SendMessageRequest(BaseModel):
    recipient_id: str
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    content: str


class MessageResponse(BaseModel):
    id: int
    user_id: str
    recipient_id: str
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    other_user_id: str
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    last_message: str
    last_message_at: datetime
    unread_count: int
    is_sender: bool


class InboxResponse(BaseModel):
    conversations: List[ConversationSummary]
    total_unread: int


class MarkReadRequest(BaseModel):
    message_ids: List[int]


class UnreadCountResponse(BaseModel):
    count: int


# ---------- Routes ----------
@router.post("/send", response_model=MessageResponse, status_code=201)
async def send_message(
    data: SendMessageRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to another user"""
    try:
        user_id = str(current_user.id)
        if user_id == data.recipient_id:
            raise HTTPException(status_code=400, detail="Cannot send message to yourself")

        msg = Messages(
            user_id=user_id,
            recipient_id=data.recipient_id,
            listing_id=data.listing_id,
            listing_title=data.listing_title,
            content=data.content,
            is_read=False,
            created_at=datetime.now(),
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error sending message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inbox", response_model=InboxResponse)
async def get_inbox(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get inbox with conversation summaries"""
    try:
        user_id = str(current_user.id)

        # Get all messages involving this user (sent or received)
        query = (
            select(Messages)
            .where(or_(Messages.user_id == user_id, Messages.recipient_id == user_id))
            .order_by(desc(Messages.created_at))
        )
        result = await db.execute(query)
        all_messages = result.scalars().all()

        # Group by conversation (other_user + listing_id)
        conversations_map: dict = {}
        total_unread = 0

        for msg in all_messages:
            is_sender = msg.user_id == user_id
            other_id = msg.recipient_id if is_sender else msg.user_id
            conv_key = f"{other_id}:{msg.listing_id or ''}"

            if conv_key not in conversations_map:
                conversations_map[conv_key] = {
                    "other_user_id": other_id,
                    "listing_id": msg.listing_id,
                    "listing_title": msg.listing_title,
                    "last_message": msg.content,
                    "last_message_at": msg.created_at,
                    "unread_count": 0,
                    "is_sender": is_sender,
                }

            # Count unread messages received by current user
            if not is_sender and not msg.is_read:
                conversations_map[conv_key]["unread_count"] += 1
                total_unread += 1

        conversations = sorted(
            conversations_map.values(),
            key=lambda c: c["last_message_at"],
            reverse=True,
        )

        return InboxResponse(
            conversations=[ConversationSummary(**c) for c in conversations],
            total_unread=total_unread,
        )
    except Exception as e:
        logger.error(f"Error fetching inbox: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation", response_model=List[MessageResponse])
async def get_conversation(
    other_user_id: str = Query(..., description="The other user's ID"),
    listing_id: Optional[str] = Query(None, description="Optional listing ID filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get conversation thread between current user and another user"""
    try:
        user_id = str(current_user.id)

        query = select(Messages).where(
            or_(
                and_(Messages.user_id == user_id, Messages.recipient_id == other_user_id),
                and_(Messages.user_id == other_user_id, Messages.recipient_id == user_id),
            )
        )

        if listing_id:
            query = query.where(Messages.listing_id == listing_id)

        query = query.order_by(Messages.created_at.asc()).offset(skip).limit(limit)
        result = await db.execute(query)
        messages = result.scalars().all()
        return messages
    except Exception as e:
        logger.error(f"Error fetching conversation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mark-read")
async def mark_messages_read(
    data: MarkReadRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark messages as read"""
    try:
        user_id = str(current_user.id)
        query = select(Messages).where(
            Messages.id.in_(data.message_ids),
            Messages.recipient_id == user_id,
        )
        result = await db.execute(query)
        messages = result.scalars().all()

        count = 0
        for msg in messages:
            if not msg.is_read:
                msg.is_read = True
                count += 1

        await db.commit()
        return {"marked_read": count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error marking messages read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get total unread message count"""
    try:
        user_id = str(current_user.id)
        query = select(func.count(Messages.id)).where(
            Messages.recipient_id == user_id,
            Messages.is_read == False,
        )
        result = await db.execute(query)
        count = result.scalar() or 0
        return UnreadCountResponse(count=count)
    except Exception as e:
        logger.error(f"Error getting unread count: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))