"""Service layer for AI chat — DB-backed message persistence with simulated AI responses."""

import uuid
import asyncio
import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import ChatMessage
from app.data.mock_data import SEED_USER, SESSION_FOCUS, CHAT_MOCK_RESPONSES

DEFAULT_USER_ID = SEED_USER["id"]


def _to_schema_dict(msg: ChatMessage) -> dict:
    """Convert ORM ChatMessage to the dict shape expected by ChatMessageSchema."""
    attachment = None
    if msg.attachment_name:
        attachment = {
            "name": msg.attachment_name,
            "type": msg.attachment_type,
            "size": msg.attachment_size,
        }
    return {
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "timestamp": msg.timestamp.isoformat() if isinstance(msg.timestamp, datetime) else str(msg.timestamp),
        "attachment": attachment,
    }


def get_chat_history(db: Session, user_id: str = DEFAULT_USER_ID) -> dict:
    """Return persisted chat messages + static session focus."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )

    return {
        "messages": [_to_schema_dict(m) for m in messages],
        "session_focus": SESSION_FOCUS,
    }


async def send_message(
    db: Session,
    content: str,
    session_topic: str = "General Study",
    user_id: str = DEFAULT_USER_ID,
) -> dict:
    """Persist user message, simulate AI delay, persist AI response, return AI message."""

    # Persist user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        role="user",
        content=content,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Simulate AI thinking delay (800 ms – 1.5 s)
    delay_ms = random.randint(800, 1500)
    await asyncio.sleep(delay_ms / 1000)

    # Generate and persist mock AI response
    ai_content = random.choice(CHAT_MOCK_RESPONSES)
    ai_msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        role="assistant",
        content=ai_content,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "message": _to_schema_dict(ai_msg),
        "typing_delay_ms": delay_ms,
    }
