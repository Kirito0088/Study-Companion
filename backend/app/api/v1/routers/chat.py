"""Chat router — GET history + POST message /api/v1/chat"""

from fastapi import APIRouter
from app.services.chat_service import get_chat_history, send_message
from app.schemas.schemas import (
    ChatHistoryResponse,
    SendMessageRequest,
    SendMessageResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("", response_model=ChatHistoryResponse)
def chat_history():
    """Return full chat history and session focus data."""
    return get_chat_history()


@router.post("/message", response_model=SendMessageResponse)
async def chat_message(body: SendMessageRequest):
    """Send a user message and receive a mock AI response with simulated delay."""
    return await send_message(body.content, body.session_topic or "General Study")
