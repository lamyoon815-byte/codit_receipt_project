from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict

from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])


# ==========================================
# DB 세션 의존성 주입 (Dependency)
# ==========================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# [기능 ①] AI 영수증 분석 Mock API
# ==========================================
@router.post("/analyze-mock", response_model=schemas.ReceiptCreate)
async def analyze_receipt_mock(file: UploadFile = File(...)):
    """
    영수증 이미지를 업로드받아 AI가 파싱한 품목/금액/카테고리 결과를 반환 (더미 데이터)
    """
    return {
        "store_name": "스타벅스 강남점",
        "date": "2026-08-16",
        "total_amount": 13500.0,
        "items": [
            {
                "name": "아이스 아메리카노",
                "price": 5500.0,
                "category": schemas.CategoryEnum.CAFE
            },
            {
                "name": "치즈 케이크",
                "price": 8000.0,
                "category": schemas.CategoryEnum.CAFE
            }
        ]
    }


# ==========================================
# [기능 ②] 소비 데이터 관리 (SQLite DB CRUD)
# ==========================================

# 1. 영수증 내역 DB 저장 (Create)
@router.post("/", response_model=schemas.ReceiptResponse, status_code=status.HTTP_201_CREATED)
def create_receipt(receipt_in: schemas.ReceiptCreate, db: Session = Depends(get_db)):
    """사용자가 확인/수정한 영수증 데이터를 SQLite DB에 최종 저장"""
    # 1) 영수증 메타 생성
    db_receipt = models.Receipt(
        store_name=receipt_in.store_name,
        date=receipt_in.date,
        total_amount=receipt_in.total_amount
    )
    db.add(db_receipt)
    db.flush()  # receipt id 발급

    # 2) 개별 품목들 연결 저장
    for item in receipt_in.items:
        db_item = models.ReceiptItem(
            receipt_id=db_receipt.id,
            name=item.name,
            price=item.price,
            category=item.category.value if isinstance(item.category, schemas.CategoryEnum) else item.category
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_receipt)
    return db_receipt


# 2. 영수증 전체 목록 조회 (Read All)
@router.get("/", response_model=List[schemas.ReceiptResponse])
def get_receipts(db: Session = Depends(get_db)):
    """저장된 모든 영수증 및 품목 목록 조회"""
    return db.query(models.Receipt).order_by(models.Receipt.date.desc()).all()


# 3. 영수증 단건 상세 조회 (Read One)
@router.get("/{receipt_id}", response_model=schemas.ReceiptResponse)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    """특정 영수증 상세 내역 조회"""
    db_receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not db_receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    return db_receipt


# 4. 영수증 및 품목 내역 수정 (Update)
@router.put("/{receipt_id}", response_model=schemas.ReceiptResponse)
def update_receipt(receipt_id: int, receipt_in: schemas.ReceiptUpdate, db: Session = Depends(get_db)):
    """영수증 상호명, 결제일, 품목 정보 수정"""
    db_receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not db_receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")

    # 메타 정보 수정
    db_receipt.store_name = receipt_in.store_name
    db_receipt.date = receipt_in.date
    db_receipt.total_amount = receipt_in.total_amount

    # 기존 세부 품목 삭제 후 재등록
    db.query(models.ReceiptItem).filter(models.ReceiptItem.receipt_id == receipt_id).delete()
    for item in receipt_in.items:
        db_item = models.ReceiptItem(
            receipt_id=db_receipt.id,
            name=item.name,
            price=item.price,
            category=item.category.value if isinstance(item.category, schemas.CategoryEnum) else item.category
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_receipt)
    return db_receipt


# 5. 영수증 삭제 (Delete)
@router.delete("/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    """영수증 및 하위 품목 완전 삭제"""
    db_receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not db_receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    db.delete(db_receipt)
    db.commit()
    return None


# ==========================================
# [기능 ③] 소비 패턴 통계 분석 (대시보드)
# ==========================================
@router.get("/summary/monthly", response_model=schemas.MonthlySummaryResponse)
def get_monthly_summary(month: str = "2026-08", db: Session = Depends(get_db)):
    """
    지정한 월(YYYY-MM)의 품목별 지출을 집계하여 8개 카테고리별 금액 및 비중(%) 반환
    """
    receipts = db.query(models.Receipt).filter(models.Receipt.date.startswith(month)).all()
    
    total_spent = sum(r.total_amount for r in receipts)
    category_totals: Dict[str, float] = defaultdict(float)

    for r in receipts:
        for item in r.items:
            category_totals[item.category] += item.price

    breakdown = []
    for cat_name, amount in category_totals.items():
        try:
            enum_cat = schemas.CategoryEnum(cat_name)
        except ValueError:
            enum_cat = schemas.CategoryEnum.ETC

        percentage = round((amount / total_spent * 100), 1) if total_spent > 0 else 0.0
        breakdown.append(schemas.CategoryStat(
            category=enum_cat,
            amount=amount,
            percentage=percentage
        ))

    # 비중 높은 순으로 정렬
    breakdown.sort(key=lambda x: x.amount, reverse=True)

    return schemas.MonthlySummaryResponse(
        month=month,
        total_spent=total_spent,
        category_breakdown=breakdown
    )


# ==========================================
# [기능 ④] AI 소비 리포트 조회
# ==========================================
@router.get("/report/ai", response_model=schemas.AIReportResponse)
def get_ai_report(month: str = "2026-08", db: Session = Depends(get_db)):
    """
    누적 소비 데이터를 기반으로 생성한 AI 자연어 소비 리포트 (현재 Mock 반환)
    """
    return {
        "month": month,
        "summary": "이번 달은 외식과 카페 지출 비중이 전체의 61%로 가장 높았습니다.",
        "highlights": [
            "지난달 대비 카페·간식 소비가 15% 증가했습니다.",
            "주말 저녁 시간대 식비 결제가 집중되어 있습니다."
        ],
        "advice": "배달 및 카페 테이크아웃 횟수를 주 2회 줄이면 약 5만 원을 절약할 수 있습니다."
    }
