from fastapi import APIRouter

from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.post("/")
def create_ticket():
    ...

@router.get("/{ticket_id}")
def get_ticket(ticket_id: int):
    return ticket_service.get_ticket(ticket_id)


@router.post("/")
def create_ticket(ticket: TicketCreate):
    return ticket_service.create_ticket(ticket)    

    
