import logging
import time
from collections import defaultdict
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.auth import User
from models.listings import Listings
from models.messages import MessageReport, MessageUserBlock, Messages
from models.profiles import BusinessProfile, UserProfile
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/messaging", tags=["messaging"])
MESSAGE_RATE_LIMITS: dict[str, tuple[int, int]] = {
    "send": (12, 60),
    "report": (5, 300),
    "block": (20, 300),
}
_message_rate_limit_state: dict[str, list[float]] = {}


# ---------- Schemas ----------
class SendMessageRequest(BaseModel):
    recipient_id: str
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    content: str = Field(..., min_length=1, max_length=4000)


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
    linked_listing_url: Optional[str] = None
    last_message: str
    last_message_at: datetime
    unread_count: int
    is_sender: bool
    participant: "ParticipantMetadata"


class InboxResponse(BaseModel):
    conversations: List[ConversationSummary]
    total_unread: int


class MarkReadRequest(BaseModel):
    message_ids: List[int]


class UnreadCountResponse(BaseModel):
    count: int


class ParticipantMetadata(BaseModel):
    user_id: str
    display_name: str
    avatar_url: Optional[str] = None
    participant_type: str = "user"
    business_name: Optional[str] = None
    business_slug: Optional[str] = None


class ConversationStateResponse(BaseModel):
    participant: ParticipantMetadata
    linked_listing_url: Optional[str] = None
    blocked_by_current_user: bool
    blocked_by_other_user: bool
    can_send: bool
    latest_report_status: Optional[str] = None
    latest_report_reason: Optional[str] = None
    latest_reported_at: Optional[datetime] = None


class BlockUserRequest(BaseModel):
    other_user_id: str
    reason: Optional[str] = Field(None, max_length=1000)


class BlockUserResponse(BaseModel):
    other_user_id: str
    is_blocked: bool
    blocked_at: Optional[datetime] = None


class ReportUserRequest(BaseModel):
    other_user_id: str
    listing_id: Optional[str] = None
    message_id: Optional[int] = None
    reason: str = Field(..., min_length=2, max_length=120)
    details: Optional[str] = Field(None, max_length=3000)


class ReportUserResponse(BaseModel):
    id: int
    other_user_id: str
    status: str
    reason: str
    created_at: datetime


def _get_request_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    client_host = request.client.host if request.client else "unknown"
    return client_host or "unknown"


def _enforce_message_rate_limit(request: Request, bucket: str) -> None:
    limit, window_seconds = MESSAGE_RATE_LIMITS[bucket]
    now = time.time()
    key = f"{bucket}:{_get_request_ip(request)}"
    attempts = _message_rate_limit_state.get(key, [])
    attempts = [attempt for attempt in attempts if now - attempt < window_seconds]

    if len(attempts) >= limit:
        retry_after = max(1, int(window_seconds - (now - attempts[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many messaging actions. Please retry later.",
            headers={"Retry-After": str(retry_after)},
        )

    attempts.append(now)
    _message_rate_limit_state[key] = attempts


def _format_listing_url(listing: Listings | None) -> Optional[str]:
    if not listing:
        return None
    module = (listing.module or "").strip() or "jobs"
    return f"/{module}/{listing.id}"


async def _load_listing_map(db: AsyncSession, listing_ids: set[str]) -> dict[str, Listings]:
    numeric_ids = sorted({int(item) for item in listing_ids if item and item.isdigit()})
    if not numeric_ids:
        return {}

    result = await db.execute(select(Listings).where(Listings.id.in_(numeric_ids)))
    return {str(item.id): item for item in result.scalars().all()}


async def _load_identity_maps(
    db: AsyncSession,
    user_ids: set[str],
) -> tuple[dict[str, UserProfile], dict[str, User], dict[str, list[BusinessProfile]], dict[str, BusinessProfile]]:
    if not user_ids:
        return {}, {}, {}, {}

    profiles_result = await db.execute(select(UserProfile).where(UserProfile.user_id.in_(user_ids)))
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    business_result = await db.execute(select(BusinessProfile).where(BusinessProfile.owner_user_id.in_(user_ids)))

    user_profiles = {profile.user_id: profile for profile in profiles_result.scalars().all()}
    users = {user.id: user for user in users_result.scalars().all()}
    businesses_by_owner: dict[str, list[BusinessProfile]] = defaultdict(list)
    businesses_by_slug: dict[str, BusinessProfile] = {}

    for business in business_result.scalars().all():
        businesses_by_owner[business.owner_user_id].append(business)
        businesses_by_slug[business.slug] = business

    return user_profiles, users, businesses_by_owner, businesses_by_slug


def _build_participant_metadata(
    other_user_id: str,
    listing: Listings | None,
    user_profiles: dict[str, UserProfile],
    users: dict[str, User],
    businesses_by_owner: dict[str, list[BusinessProfile]],
    businesses_by_slug: dict[str, BusinessProfile],
) -> ParticipantMetadata:
    profile = user_profiles.get(other_user_id)
    user = users.get(other_user_id)
    display_name = profile.name if profile and profile.name else None
    avatar_url = profile.avatar_url if profile else None
    participant_type = "user"
    business_name: Optional[str] = None
    business_slug: Optional[str] = None

    if listing and listing.owner_type == "business_profile":
        business = businesses_by_slug.get(listing.owner_id)
        if business and business.owner_user_id == other_user_id:
            participant_type = "business"
            business_name = business.name
            business_slug = business.slug
            display_name = business.name
            avatar_url = business.logo_url or avatar_url

    if not display_name and user and user.name:
        display_name = user.name
    if not display_name and user and user.email:
        display_name = user.email.split("@", 1)[0]
    if not display_name and businesses_by_owner.get(other_user_id):
        fallback_business = businesses_by_owner[other_user_id][0]
        business_name = business_name or fallback_business.name
        business_slug = business_slug or fallback_business.slug
    if not display_name:
        display_name = business_name or other_user_id

    return ParticipantMetadata(
        user_id=other_user_id,
        display_name=display_name,
        avatar_url=avatar_url,
        participant_type=participant_type,
        business_name=business_name,
        business_slug=business_slug,
    )


async def _get_block_flags(db: AsyncSession, current_user_id: str, other_user_id: str) -> tuple[bool, bool]:
    result = await db.execute(
        select(MessageUserBlock).where(
            or_(
                and_(
                    MessageUserBlock.blocker_user_id == current_user_id,
                    MessageUserBlock.blocked_user_id == other_user_id,
                ),
                and_(
                    MessageUserBlock.blocker_user_id == other_user_id,
                    MessageUserBlock.blocked_user_id == current_user_id,
                ),
            )
        )
    )
    rows = result.scalars().all()
    blocked_by_current = any(
        row.blocker_user_id == current_user_id and row.blocked_user_id == other_user_id for row in rows
    )
    blocked_by_other = any(
        row.blocker_user_id == other_user_id and row.blocked_user_id == current_user_id for row in rows
    )
    return blocked_by_current, blocked_by_other


async def _get_latest_report(
    db: AsyncSession,
    current_user_id: str,
    other_user_id: str,
    listing_id: str | None,
) -> MessageReport | None:
    query = select(MessageReport).where(
        MessageReport.reporter_user_id == current_user_id,
        MessageReport.reported_user_id == other_user_id,
    )
    if listing_id:
        query = query.where(MessageReport.listing_id == listing_id)
    else:
        query = query.where(MessageReport.listing_id.is_(None))
    result = await db.execute(query.order_by(MessageReport.created_at.desc()).limit(1))
    return result.scalar_one_or_none()


async def _build_conversation_state(
    db: AsyncSession,
    current_user_id: str,
    other_user_id: str,
    listing_id: str | None,
) -> ConversationStateResponse:
    listing_map = await _load_listing_map(db, {listing_id} if listing_id else set())
    listing = listing_map.get(listing_id) if listing_id else None
    user_profiles, users, businesses_by_owner, businesses_by_slug = await _load_identity_maps(db, {other_user_id})
    participant = _build_participant_metadata(
        other_user_id,
        listing,
        user_profiles,
        users,
        businesses_by_owner,
        businesses_by_slug,
    )
    blocked_by_current, blocked_by_other = await _get_block_flags(db, current_user_id, other_user_id)
    latest_report = await _get_latest_report(db, current_user_id, other_user_id, listing_id)
    return ConversationStateResponse(
        participant=participant,
        linked_listing_url=_format_listing_url(listing),
        blocked_by_current_user=blocked_by_current,
        blocked_by_other_user=blocked_by_other,
        can_send=not blocked_by_current and not blocked_by_other,
        latest_report_status=latest_report.status if latest_report else None,
        latest_report_reason=latest_report.reason if latest_report else None,
        latest_reported_at=latest_report.created_at if latest_report else None,
    )


# ---------- Routes ----------
@router.post("/send", response_model=MessageResponse, status_code=201)
async def send_message(
    data: SendMessageRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to another user"""
    try:
        _enforce_message_rate_limit(request, "send")
        user_id = str(current_user.id)
        if user_id == data.recipient_id:
            raise HTTPException(status_code=400, detail="Cannot send message to yourself")

        blocked_by_current, blocked_by_other = await _get_block_flags(db, user_id, data.recipient_id)
        if blocked_by_current:
            raise HTTPException(status_code=403, detail="You blocked this participant. Unblock to continue messaging.")
        if blocked_by_other:
            raise HTTPException(status_code=403, detail="This participant is not accepting messages from you.")

        content = data.content.strip()
        if not content:
            raise HTTPException(status_code=400, detail="Message content cannot be empty")

        msg = Messages(
            user_id=user_id,
            recipient_id=data.recipient_id,
            listing_id=data.listing_id,
            listing_title=data.listing_title,
            content=content,
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

        listing_ids = {msg.listing_id for msg in all_messages if msg.listing_id}
        listing_map = await _load_listing_map(db, {item for item in listing_ids if item})
        other_user_ids = {
            (msg.recipient_id if msg.user_id == user_id else msg.user_id)
            for msg in all_messages
        }
        user_profiles, users, businesses_by_owner, businesses_by_slug = await _load_identity_maps(db, other_user_ids)

        # Group by conversation (other_user + listing_id)
        conversations_map: dict = {}
        total_unread = 0

        for msg in all_messages:
            is_sender = msg.user_id == user_id
            other_id = msg.recipient_id if is_sender else msg.user_id
            conv_key = f"{other_id}:{msg.listing_id or ''}"
            linked_listing = listing_map.get(msg.listing_id) if msg.listing_id else None

            if conv_key not in conversations_map:
                conversations_map[conv_key] = {
                    "other_user_id": other_id,
                    "listing_id": msg.listing_id,
                    "listing_title": msg.listing_title,
                    "linked_listing_url": _format_listing_url(linked_listing),
                    "last_message": msg.content,
                    "last_message_at": msg.created_at,
                    "unread_count": 0,
                    "is_sender": is_sender,
                    "participant": _build_participant_metadata(
                        other_id,
                        linked_listing,
                        user_profiles,
                        users,
                        businesses_by_owner,
                        businesses_by_slug,
                    ),
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


@router.get("/conversation-state", response_model=ConversationStateResponse)
async def get_conversation_state(
    other_user_id: str = Query(..., description="The other user's ID"),
    listing_id: Optional[str] = Query(None, description="Optional listing ID filter"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = str(current_user.id)
        if user_id == other_user_id:
            raise HTTPException(status_code=400, detail="Conversation state is unavailable for self messaging")
        return await _build_conversation_state(db, user_id, other_user_id, listing_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation state: {e}", exc_info=True)
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


@router.post("/block", response_model=BlockUserResponse)
async def block_user(
    data: BlockUserRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _enforce_message_rate_limit(request, "block")
        user_id = str(current_user.id)
        if user_id == data.other_user_id:
            raise HTTPException(status_code=400, detail="Cannot block yourself")

        result = await db.execute(
            select(MessageUserBlock).where(
                MessageUserBlock.blocker_user_id == user_id,
                MessageUserBlock.blocked_user_id == data.other_user_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            if data.reason:
                existing.reason = data.reason.strip() or None
                await db.commit()
            return BlockUserResponse(other_user_id=data.other_user_id, is_blocked=True, blocked_at=existing.created_at)

        block = MessageUserBlock(
            blocker_user_id=user_id,
            blocked_user_id=data.other_user_id,
            reason=data.reason.strip() if data.reason else None,
        )
        db.add(block)
        await db.commit()
        await db.refresh(block)
        return BlockUserResponse(other_user_id=data.other_user_id, is_blocked=True, blocked_at=block.created_at)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error blocking user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/block/{other_user_id}", response_model=BlockUserResponse)
async def unblock_user(
    other_user_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = str(current_user.id)
        result = await db.execute(
            select(MessageUserBlock).where(
                MessageUserBlock.blocker_user_id == user_id,
                MessageUserBlock.blocked_user_id == other_user_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            await db.delete(existing)
            await db.commit()
        return BlockUserResponse(other_user_id=other_user_id, is_blocked=False, blocked_at=None)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error unblocking user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report", response_model=ReportUserResponse, status_code=201)
async def report_user(
    data: ReportUserRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _enforce_message_rate_limit(request, "report")
        user_id = str(current_user.id)
        if user_id == data.other_user_id:
            raise HTTPException(status_code=400, detail="Cannot report yourself")

        report = MessageReport(
            reporter_user_id=user_id,
            reported_user_id=data.other_user_id,
            message_id=data.message_id,
            listing_id=data.listing_id,
            reason=data.reason.strip(),
            details=data.details.strip() if data.details else None,
            status="pending",
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return ReportUserResponse(
            id=report.id,
            other_user_id=data.other_user_id,
            status=report.status,
            reason=report.reason,
            created_at=report.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error reporting user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
