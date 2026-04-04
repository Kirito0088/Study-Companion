"""Assignments router — full CRUD /api/v1/assignments"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.assignment_service import (
    get_assignments,
    create_assignment,
    update_assignment,
    delete_assignment,
)
from app.schemas.schemas import (
    AssignmentsResponse,
    AssignmentSchema,
    CreateAssignmentRequest,
    UpdateAssignmentRequest,
)

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.get("", response_model=AssignmentsResponse)
def list_assignments(db: Session = Depends(get_db)):
    """Return assignment stats and full assignment list."""
    return get_assignments(db)


@router.post("", response_model=AssignmentSchema, status_code=201)
def add_assignment(body: CreateAssignmentRequest, db: Session = Depends(get_db)):
    """Create a new assignment."""
    return create_assignment(db, body.model_dump())


@router.put("/{assignment_id}", response_model=AssignmentSchema)
def edit_assignment(
    assignment_id: str,
    body: UpdateAssignmentRequest,
    db: Session = Depends(get_db),
):
    """Update an assignment by ID."""
    result = update_assignment(db, assignment_id, body.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return result


@router.delete("/{assignment_id}", status_code=204)
def remove_assignment(assignment_id: str, db: Session = Depends(get_db)):
    """Delete an assignment by ID."""
    success = delete_assignment(db, assignment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
