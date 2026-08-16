from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ==========================================
# 0. 7개 표준 카테고리 Enum
# ==========================================
class CategoryEnum(str, Enum):
    FOOD = "식비"
    CAFE = "카페·간식"
    SHOPPING = "쇼핑"
    TRANSPORT = "교통"
    HEALTH = "의료·건강"
    CULTURE = "문화·여가"
    ETC = "기타"


# ==========================================
# 1. 품목(Item) 스키마
# ==========================================
class ReceiptItemBase(BaseModel):
    name: str = Field(..., example="아이스 아메리카노")
    price: float = Field(..., example=5500.0)
    category: CategoryEnum = Field(default=CategoryEnum.ETC, example="카페·간식")


class ReceiptItemCreate(ReceiptItemBase):
    pass


class ReceiptItemUpdate(ReceiptItemBase):
    id: Optional[int] = Field(None, example=1)


class ReceiptItemResponse(ReceiptItemBase):
    id: int

    class Config:
        from_attributes = True


# ==========================================
# 2. 영수증(Receipt) 분석 및 저장/수정 스키마
# ==========================================
class ReceiptBase(BaseModel):
    store_name: str = Field(..., example="스타벅스 강남점")
    date: str = Field(..., example="2026-08-16")
    total_amount: float = Field(..., example=13500.0)


# [기능 ① & ②] 등록 및 AI 분석 결과
class ReceiptCreate(ReceiptBase):
    items: List[ReceiptItemCreate]


# [기능 ②] 수정 요청
class ReceiptUpdate(ReceiptBase):
    items: List[ReceiptItemUpdate]


# [기능 ②] 상세 조회 응답
class ReceiptResponse(ReceiptBase):
    id: int
    items: List[ReceiptItemResponse]
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# 3. [기능 ③] 소비 패턴 분석 통계 스키마
# ==========================================
class CategoryStat(BaseModel):
    category: CategoryEnum = Field(..., example="카페·간식")
    amount: float = Field(..., example=65000.0)
    percentage: float = Field(..., example=14.4)


class MonthlySummaryResponse(BaseModel):
    month: str = Field(..., example="2026-08")
    total_spent: float = Field(..., example=450000.0)
    category_breakdown: List[CategoryStat]


# ==========================================
# 4. [기능 ④] AI 소비 리포트 스키마
# ==========================================
class AIReportResponse(BaseModel):
    month: str = Field(..., example="2026-08")
    summary: str = Field(..., example="이번 달은 외식과 카페 지출 비중이 전체의 61%로 가장 높았습니다.")
    highlights: List[str] = Field(
        ..., 
        example=[
            "지난달 대비 카페·간식 소비가 15% 증가했습니다.",
            "주말 저녁 시간대 식비 결제가 집중되어 있습니다."
        ]
    )
    advice: str = Field(..., example="배달 및 카페 테이크아웃 횟수를 주 2회 줄이면 약 5만 원을 절약할 수 있습니다.")