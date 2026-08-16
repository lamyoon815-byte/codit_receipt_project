from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReceiptBase(BaseModel):
    store_name: str
    purchase_date: str
    total_amount: float
    category: str

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptResponse(ReceiptBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True