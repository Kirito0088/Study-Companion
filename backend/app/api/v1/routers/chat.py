"""Chat router — GET history + POST message /api/v1/chat"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.chat_service import get_chat_history, send_message
from app.schemas.schemas import (
    ChatHistoryResponse,
    SendMessageRequest,
    SendMessageResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("", response_model=ChatHistoryResponse)
def chat_history(db: Session = Depends(get_db)):
    """Return full chat history and session focus data."""
    return get_chat_history(db)


@router.post("/message", response_model=SendMessageResponse)
async def chat_message(body: SendMessageRequest, db: Session = Depends(get_db)):
    """Send a user message and receive a mock AI response with simulated delay."""
    return await send_message(db, body.content, body.session_topic or "General Study")
