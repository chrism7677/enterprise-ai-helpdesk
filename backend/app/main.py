#Start wtih uvicorn app.main:app --reload

from fastapi import FastAPI

from app.api.routes.tickets import router as ticket_router


app = FastAPI()

app.include_router(ticket_router)


#DB connection?


#start with uvicorn app.main:app --reload
