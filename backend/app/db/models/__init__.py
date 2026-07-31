#Export the models
#This matters because Alembic must import the models to discover their tables.

from app.db.models.ticket import Ticket
from app.db.models.user import User

__all__ = ["Ticket", "User"]
