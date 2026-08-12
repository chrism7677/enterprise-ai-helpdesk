from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.db.models.ticket import Ticket
    from app.db.models.ticket_note import TicketNote


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint(
            "role IN ('employee', 'it_staff')",
            name="ck_users_role",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=False,
    )

    entra_oid: Mapped[str | None] = mapped_column(
        String(36),
        unique=True,
        index=True,
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="employee",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    requested_tickets: Mapped[list["Ticket"]] = relationship(
        back_populates="requester",
        foreign_keys="Ticket.requester_id",
    )

    assigned_tickets: Mapped[list["Ticket"]] = relationship(
        back_populates="assignee",
        foreign_keys="Ticket.assignee_id",
    )

    authored_notes: Mapped[list["TicketNote"]] = relationship(
        back_populates="author",
    )
