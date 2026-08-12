"""add Entra object identifier to users

Revision ID: 4f6e8a9b1c2d
Revises: 8e72c5f4a913
Create Date: 2026-08-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4f6e8a9b1c2d"
down_revision: Union[str, Sequence[str], None] = "8e72c5f4a913"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add a nullable, unique Entra object identifier to users."""
    op.add_column(
        "users",
        sa.Column("entra_oid", sa.String(length=36), nullable=True),
    )
    op.create_index(
        op.f("ix_users_entra_oid"),
        "users",
        ["entra_oid"],
        unique=True,
    )


def downgrade() -> None:
    """Remove the Entra object identifier from users."""
    op.drop_index(op.f("ix_users_entra_oid"), table_name="users")
    op.drop_column("users", "entra_oid")
