from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict
from datetime import datetime, timedelta
import shutil
import tempfile
import os

from app.database import SessionLocal
from app import models, schemas
from ai.receipt_analyzer import analyze_receipt_image
from ai.report_generator import generate_ai_report

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
@router.post("/analyze", response_model=schemas.ReceiptCreate)
async def analyze_receipt(file: UploadFile = File(...)):
    """
    영수증 이미지를 업로드받아 실제 AI(OpenAI Vision)로 분석한 결과를 반환
    """
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = analyze_receipt_image(tmp_path)
    except Exception as e:
        raise HTTPException(
        status_code=500,
        detail={"code": "AI_ANALYSIS_FAILED", "message": f"AI 분석 실패: {str(e)}"}
    )
    finally:
        os.remove(tmp_path)

    return schemas.ReceiptCreate(
        store_name=result.store_name,
        date=result.date,
        total_amount=result.total_amount,
        items=[
            schemas.ReceiptItemCreate(
                name=item.name,
                price=item.price,
                category=schemas.CategoryEnum(item.category.value)
            )
            for item in result.items
        ]
    )


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
        raise HTTPException(
        status_code=404,
        detail={"code": "RECEIPT_NOT_FOUND", "message": "영수증을 찾을 수 없습니다."}
    )
    return db_receipt


# 4. 영수증 및 품목 내역 수정 (Update)
@router.put("/{receipt_id}", response_model=schemas.ReceiptResponse)
def update_receipt(receipt_id: int, receipt_in: schemas.ReceiptUpdate, db: Session = Depends(get_db)):
    """영수증 상호명, 결제일, 품목 정보 수정"""
    db_receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not db_receipt:
        raise HTTPException(
        status_code=404,
        detail={"code": "RECEIPT_NOT_FOUND", "message": "영수증을 찾을 수 없습니다."}
    )

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
        raise HTTPException(
        status_code=404,
        detail={"code": "RECEIPT_NOT_FOUND", "message": "영수증을 찾을 수 없습니다."}
    )
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
    누적 소비 데이터를 기반으로 생성한 AI 자연어 소비 리포트
    """
    # 1) 기존 월별 집계 함수 그대로 재사용
    monthly_summary = get_monthly_summary(month=month, db=db)

    if monthly_summary.total_spent == 0:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_DATA_FOR_MONTH", "message": f"{month}에 해당하는 소비 데이터가 없습니다."}
    )

    try:
        result = generate_ai_report(monthly_summary.model_dump(mode="json"))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "AI_REPORT_FAILED", "message": f"AI 리포트 생성 실패: {str(e)}"}
    )
    return schemas.AIReportResponse(
        month=result.month,
        summary=result.summary,
        highlights=result.highlights,
        advice=result.advice
    )

# ==========================================
# [신규 ①] 일/주/월 소비 금액 및 결제 횟수
# ==========================================
@router.get("/stats/summary", response_model=schemas.PeriodSummaryResponse)
def get_period_summary(
    period: str = Query("month", pattern="^(day|week|month)$", description="day, week, month 중 하나"),
    date: str = Query(None, description="기준 날짜 YYYY-MM-DD (미입력 시 오늘)"),
    db: Session = Depends(get_db)
):
    """
    지정한 기간(일/주/월) 기준으로 총 소비 금액과 결제 횟수를 반환
    """
    ref_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.today().date()

    if period == "day":
        start = end = ref_date
    elif period == "week":
        start = ref_date - timedelta(days=ref_date.weekday())  # 그 주 월요일
        end = start + timedelta(days=6)
    else:  # month
        start = ref_date.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)

    receipts = db.query(models.Receipt).filter(
        models.Receipt.date >= start.isoformat(),
        models.Receipt.date <= end.isoformat()
    ).all()

    return schemas.PeriodSummaryResponse(
        period=period,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        total_spent=sum(r.total_amount for r in receipts),
        payment_count=len(receipts)
    )


# ==========================================
# [신규 ②] 기간별 소비 추이 (그래프용 시계열)
# ==========================================
@router.get("/stats/trend", response_model=schemas.TrendResponse)
def get_trend(
    period: str = Query("month", pattern="^(day|week|month)$"),
    count: int = Query(6, ge=1, le=24, description="조회할 구간 개수"),
    db: Session = Depends(get_db)
):
    """
    최근 N개 구간(일/주/월)의 소비 금액 추이를 시계열로 반환
    """
    today = datetime.today().date()
    points = []

    if period == "month":
        for i in range(count - 1, -1, -1):
            year, month = today.year, today.month - i
            while month <= 0:
                month += 12
                year -= 1
            label = f"{year}-{month:02d}"
            receipts = db.query(models.Receipt).filter(models.Receipt.date.startswith(label)).all()
            points.append(schemas.TrendPoint(label=label, amount=sum(r.total_amount for r in receipts)))

    elif period == "week":
        for i in range(count - 1, -1, -1):
            week_start = today - timedelta(days=today.weekday() + i * 7)
            week_end = week_start + timedelta(days=6)
            receipts = db.query(models.Receipt).filter(
                models.Receipt.date >= week_start.isoformat(),
                models.Receipt.date <= week_end.isoformat()
            ).all()
            points.append(schemas.TrendPoint(label=week_start.isoformat(), amount=sum(r.total_amount for r in receipts)))

    else:  # day
        for i in range(count - 1, -1, -1):
            day = today - timedelta(days=i)
            receipts = db.query(models.Receipt).filter(models.Receipt.date == day.isoformat()).all()
            points.append(schemas.TrendPoint(label=day.isoformat(), amount=sum(r.total_amount for r in receipts)))

    return schemas.TrendResponse(period=period, points=points)


# ==========================================
# [신규 ③] 전월 대비 전체/카테고리별 증감률
# ==========================================
@router.get("/stats/comparison", response_model=schemas.ComparisonResponse)
def get_comparison(month: str = "2026-08", db: Session = Depends(get_db)):
    """
    지정한 월과 그 전월을 비교하여 전체 및 카테고리별 증감률(%) 반환
    """
    year, mon = map(int, month.split("-"))
    prev_year, prev_mon = (year - 1, 12) if mon == 1 else (year, mon - 1)
    prev_month = f"{prev_year}-{prev_mon:02d}"

    current = get_monthly_summary(month=month, db=db)
    previous = get_monthly_summary(month=prev_month, db=db)

    def rate(cur: float, prev: float) -> float:
        if prev == 0:
            return 100.0 if cur > 0 else 0.0
        return round((cur - prev) / prev * 100, 1)

    prev_map = {c.category: c.amount for c in previous.category_breakdown}
    cur_map = {c.category: c.amount for c in current.category_breakdown}

    category_changes = []
    for cat in set(prev_map) | set(cur_map):
        cur_amt = cur_map.get(cat, 0.0)
        prev_amt = prev_map.get(cat, 0.0)
        category_changes.append(schemas.CategoryChange(
            category=cat,
            current_amount=cur_amt,
            previous_amount=prev_amt,
            change_rate=rate(cur_amt, prev_amt)
        ))
    category_changes.sort(key=lambda x: x.current_amount, reverse=True)

    return schemas.ComparisonResponse(
        current_month=month,
        previous_month=prev_month,
        total_current=current.total_spent,
        total_previous=previous.total_spent,
        total_change_rate=rate(current.total_spent, previous.total_spent),
        category_changes=category_changes
    )


# ==========================================
# [신규 ④] 자주 구매한 품목 TOP N
# ==========================================
@router.get("/stats/top-items", response_model=schemas.TopItemsResponse)
def get_top_items(month: str = "2026-08", limit: int = 5, db: Session = Depends(get_db)):
    """
    지정한 월에 가장 자주(횟수 기준) 구매한 품목 TOP N 반환
    """
    receipts = db.query(models.Receipt).filter(models.Receipt.date.startswith(month)).all()

    item_stats: Dict[str, Dict[str, float]] = defaultdict(lambda: {"count": 0, "total_amount": 0.0})
    for r in receipts:
        for item in r.items:
            item_stats[item.name]["count"] += 1
            item_stats[item.name]["total_amount"] += item.price

    top_items = sorted(
        [schemas.TopItem(name=name, count=int(s["count"]), total_amount=s["total_amount"])
         for name, s in item_stats.items()],
        key=lambda x: x.count,
        reverse=True
    )[:limit]

    return schemas.TopItemsResponse(month=month, items=top_items)


# ==========================================
# [신규 ⑤] 자주 방문한 매장 TOP N
# ==========================================
@router.get("/stats/top-stores", response_model=schemas.TopStoresResponse)
def get_top_stores(month: str = "2026-08", limit: int = 5, db: Session = Depends(get_db)):
    """
    지정한 월에 가장 자주 방문한 매장 TOP N 반환
    """
    receipts = db.query(models.Receipt).filter(models.Receipt.date.startswith(month)).all()

    store_stats: Dict[str, Dict[str, float]] = defaultdict(lambda: {"visit_count": 0, "total_amount": 0.0})
    for r in receipts:
        store_stats[r.store_name]["visit_count"] += 1
        store_stats[r.store_name]["total_amount"] += r.total_amount

    top_stores = sorted(
        [schemas.TopStore(store_name=name, visit_count=int(s["visit_count"]), total_amount=s["total_amount"])
         for name, s in store_stats.items()],
        key=lambda x: x.visit_count,
        reverse=True
    )[:limit]

    return schemas.TopStoresResponse(month=month, stores=top_stores)
