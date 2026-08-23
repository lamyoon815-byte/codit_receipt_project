from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ==========================================
# 0. 8개 표준 카테고리 Enum
# ==========================================
class CategoryEnum(str, Enum):
    FOOD = "FOOD"
    CAFE = "CAFE"
    DAILY = "DAILY"
    SHOPPING = "SHOPPING"
    TRANSPORT = "TRANSPORT"
    HEALTH = "HEALTH"
    CULTURE = "CULTURE"
    ETC = "ETC"


# ==========================================
# 1. 품목(Item) 스키마
# ==========================================
class ReceiptItemBase(BaseModel):
    name: str = Field(..., example="아이스 아메리카노")
    price: int = Field(..., example=5500)
    category: CategoryEnum = Field(default=CategoryEnum.ETC, example="CAFE")


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
    total_amount: int = Field(..., example=13500)


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
    category: CategoryEnum = Field(..., example="CAFE")
    amount: int = Field(..., example=65000)
    percentage: float = Field(..., example=14.4)


class MonthlySummaryResponse(BaseModel):
    month: str = Field(..., example="2026-08")
    total_spent: int = Field(..., example=450000)
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


# ==========================================
# 5. [신규] 기간별 통계 (일/주/월)
# ==========================================
class PeriodSummaryResponse(BaseModel):
    period: str = Field(..., example="month")
    start_date: str = Field(..., example="2026-08-01")
    end_date: str = Field(..., example="2026-08-31")
    total_spent: int = Field(..., example=450000)
    payment_count: int = Field(..., example=12)


# ==========================================
# 6. [신규] 기간별 소비 추이 (그래프용)
# ==========================================
class TrendPoint(BaseModel):
    label: str = Field(..., example="2026-08")
    amount: int = Field(..., example=120000)


class TrendResponse(BaseModel):
    period: str = Field(..., example="month")
    points: List[TrendPoint]


# ==========================================
# 7. [신규] 전월 대비 증감률
# ==========================================
class CategoryChange(BaseModel):
    category: CategoryEnum
    current_amount: int
    previous_amount: int
    change_rate: float = Field(..., example=15.0)


class ComparisonResponse(BaseModel):
    current_month: str = Field(..., example="2026-08")
    previous_month: str = Field(..., example="2026-07")
    total_current: int
    total_previous: int
    total_change_rate: float = Field(..., example=8.5)
    category_changes: List[CategoryChange]


# ==========================================
# 8. [신규] 자주 구매한 품목 TOP N
# ==========================================
class TopItem(BaseModel):
    name: str = Field(..., example="아이스 아메리카노")
    count: int = Field(..., example=7)
    total_amount: int = Field(..., example=38500)


class TopItemsResponse(BaseModel):
    month: str = Field(..., example="2026-08")
    items: List[TopItem]


# ==========================================
# 9. [신규] 자주 방문한 매장 TOP N
# ==========================================
class TopStore(BaseModel):
    store_name: str = Field(..., example="스타벅스 강남점")
    visit_count: int = Field(..., example=5)
    total_amount: int = Field(..., example=67500)


class TopStoresResponse(BaseModel):
    month: str = Field(..., example="2026-08")
    stores: List[TopStore]