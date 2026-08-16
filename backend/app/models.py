from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, index=True)       # 상호명
    purchase_date = Column(String)               # 결제일자 (YYYY-MM-DD)
    total_amount = Column(Float)                 # 총 금액
    category = Column(String, default="기타")    # 식비, 카페, 쇼핑 등
    raw_text = Column(String, nullable=True)     # OCR 추출 원본 텍스트
    created_at = Column(DateTime, default=datetime.utcnow)