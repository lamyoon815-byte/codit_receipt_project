from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import receipts

# SQLite 테이블 자동 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReceiptAI Backend API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipts.router)

@app.get("/")
def root():
    return {"message": "ReceiptAI API Server is running!"}
