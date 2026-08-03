"""create ticket notes

Revision ID: 8e72c5f4a913
Revises: ba3592ba894d
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8e72c5f4a913"
down_revision: Union[str, Sequence[str], None] = "ba3592ba894d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the ticket notes table."""
    op.create_table(
        "ticket_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticket_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["author_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"], ["tickets.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ticket_notes_author_id"),
        "ticket_notes",
        ["author_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_notes_ticket_id"),
        "ticket_notes",
        ["ticket_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the ticket notes table."""
    op.drop_index(
        op.f("ix_ticket_notes_ticket_id"), table_name="ticket_notes"
    )
    op.drop_index(
        op.f("ix_ticket_notes_author_id"), table_name="ticket_notes"
    )
    op.drop_table("ticket_notes")
