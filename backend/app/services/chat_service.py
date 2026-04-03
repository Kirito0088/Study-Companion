"""Service layer for AI chat with simulated typing delay."""

import uuid
import asyncio
import random
from datetime import datetime, timezone
from app.data.mock_data import CHAT_HISTORY, CHAT_MOCK_RESPONSES, SESSION_FOCUS


def get_chat_history() -> dict:
    return {
        "messages": CHAT_HISTORY,
        "session_focus": SESSION_FOCUS,
    }


async def send_message(content: str, session_topic: str = "General Study") -> dict:
    # Record user message
    user_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "user",
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "attachment": None,
    }
    CHAT_HISTORY.append(user_msg)

    # Simulate AI thinking delay (800ms – 1.5s)
    delay_ms = random.randint(800, 1500)
    await asyncio.sleep(delay_ms / 1000)

    # Generate mock AI response
    ai_content = random.choice(CHAT_MOCK_RESPONSES)
    ai_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "assistant",
        "content": ai_content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "attachment": None,
    }
    CHAT_HISTORY.append(ai_msg)

    return {
        "message": ai_msg,
        "typing_delay_ms": delay_ms,
    }
