#Export the models
#This matters because Alembic must import the models to discover their tables.

from app.models.ticket import Ticket
from app.models.user import User

__all__ = ["Ticket", "User"]

