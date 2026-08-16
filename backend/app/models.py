from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, index=True)       # 상호명 (예: 스타벅스)
    date = Column(String)                         # 결제 날짜 (YYYY-MM-DD)
    total_amount = Column(Float)                 # 총 결제 금액
    created_at = Column(DateTime, default=datetime.utcnow)

    # 1:N 관계 설정 (영수증 하나에 여러 품목)
    items = relationship("ReceiptItem", back_populates="receipt", cascade="all, delete-orphan")


class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id")) # 소속 영수증 ID
    name = Column(String)                                   # 품목명 (예: 아메리카노)
    price = Column(Float)                                  # 품목 가격
    category = Column(String, default="기타")              # 카테고리 (예: 카페·간식)

    receipt = relationship("Receipt", back_populates="items")