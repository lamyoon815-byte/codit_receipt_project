from fastapi import APIRouter, UploadFile, File
from typing import List
from app.schemas import ReceiptResponse

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])

@router.post("/analyze-mock", response_model=ReceiptResponse)
async def analyze_receipt_mock(file: UploadFile = File(...)):
    """프론트엔드 연동 테스트용 가짜 AI 분석 API"""
    return {
        "id": 1,
        "store_name": "스타벅스 강남점",
        "purchase_date": "2026-08-17",
        "total_amount": 12500.0,
        "category": "카페/간식",
        "created_at": "2026-08-17T09:00:00"
    }

@router.get("/monthly-summary")
async def get_monthly_summary():
    """소비 패턴 분석 통계 더미 데이터"""
    return {
        "month": "2026-08",
        "total_spent": 450000,
        "category_breakdown": {
            "식비": 210000,
            "카페/간식": 65000,
            "교통": 55000,
            "쇼핑": 120000
        }
    }