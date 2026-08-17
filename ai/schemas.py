from enum import Enum
from typing import List

from pydantic import BaseModel, Field, field_validator


class CategoryEnum(str, Enum):
    FOOD = "식비"
    CAFE = "카페·간식"
    DAILY = "생활·생필품"
    SHOPPING = "쇼핑"
    TRANSPORT = "교통"
    HEALTH = "의료·건강"
    CULTURE = "문화·여가"
    ETC = "기타"


class ReceiptItem(BaseModel):
    name: str = Field(..., min_length=1)
    price: float = Field(..., ge=0)
    category: CategoryEnum = CategoryEnum.ETC


class ReceiptAnalysisResult(BaseModel):
    store_name: str = Field(..., min_length=1)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    total_amount: float = Field(..., ge=0)
    items: List[ReceiptItem] = Field(default_factory=list)

    @field_validator("store_name")
    @classmethod
    def strip_store_name(cls, value: str) -> str:
        return value.strip()


class CategoryStat(BaseModel):
    category: CategoryEnum
    amount: float = Field(..., ge=0)
    percentage: float = Field(..., ge=0, le=100)


class MonthlySummaryInput(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    total_spent: float = Field(..., ge=0)
    category_breakdown: List[CategoryStat] = Field(default_factory=list)


class AIReportResult(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    summary: str
    highlights: List[str]
    advice: str


RECEIPT_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["store_name", "date", "total_amount", "items"],
    "properties": {
        "store_name": {"type": "string"},
        "date": {"type": "string"},
        "total_amount": {"type": "number"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "price", "category"],
                "properties": {
                    "name": {"type": "string"},
                    "price": {"type": "number"},
                    "category": {
                        "type": "string",
                        "enum": [category.value for category in CategoryEnum],
                    },
                },
            },
        },
    },
}

REPORT_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["month", "summary", "highlights", "advice"],
    "properties": {
        "month": {"type": "string"},
        "summary": {"type": "string"},
        "highlights": {
            "type": "array",
            "items": {"type": "string"},
        },
        "advice": {"type": "string"},
    },
}
