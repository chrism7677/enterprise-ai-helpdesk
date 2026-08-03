from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: Literal["hardware", "software", "network", "access", "other"]
    priority: Literal["low", "medium", "high"] = "medium"
    requester_id: int = Field(gt=0)


class TicketClaim(BaseModel):
    assignee_id: int = Field(gt=0)


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
