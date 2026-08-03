from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: Literal["hardware", "software", "network", "access", "other"]
    priority: Literal["low", "medium", "high"] = "medium"
    requester_id: int = Field(gt=0)


class TicketClaim(BaseModel):
    assignee_id: int = Field(gt=0)


class TicketNoteCreate(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def body_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Note body must not be blank")
        return value


class TicketNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    author_id: int
    body: str
    created_at: datetime


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    requester_id: int
    assignee_id: int | None
    created_at: datetime
    updated_at: datetime


class TicketDetailResponse(TicketResponse):
    notes: list[TicketNoteResponse]
