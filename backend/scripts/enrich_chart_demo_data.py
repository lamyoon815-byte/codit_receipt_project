"""Add balanced demo receipts for Spendly charts without touching existing data."""

from __future__ import annotations

import json
import urllib.request
from datetime import date
from pathlib import Path


API_URL = "http://127.0.0.1:8000/api/receipts/"
MANIFEST_PATH = Path(__file__).resolve().parents[1] / "data" / "chart_demo_seed_ids.json"

CATEGORIES = [
    ("FOOD", "맛있는 식탁", "점심 식사", 34000),
    ("CAFE", "브루밍 카페", "커피와 디저트", 19000),
    ("SHOPPING", "라이프 편집숍", "생활 소품", 31000),
    ("TRANSPORT", "서울 교통", "교통 이용", 12000),
    ("DAILY", "우리 생활마트", "생활용품", 21000),
    ("HEALTH", "튼튼 약국", "건강 관리", 27000),
    ("CULTURE", "컬처 스테이션", "문화생활", 23000),
    ("ETC", "기타 지출", "기타 결제", 9000),
]


def post_receipt(payload: dict) -> int:
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return int(json.loads(response.read().decode("utf-8"))["id"])


def build_receipts() -> list[dict]:
    receipts: list[dict] = []
    recent_august_days = [18, 19, 20, 21, 22, 23, 24, 24]

    for month in range(3, 9):
        # A gentle month-over-month rise makes the six-month chart easy to read.
        month_factor = 0.82 + (month - 3) * 0.075
        for index, (category, store, item, base_amount) in enumerate(CATEGORIES):
            day = recent_august_days[index] if month == 8 else 3 + ((index * 3 + month) % 24)
            # August gets a small presentation boost so the current month is not
            # lower than July even when the user's existing receipts are included.
            current_month_boost = 1.28 if month == 8 else 1.0
            amount = round(base_amount * month_factor * current_month_boost / 100) * 100
            receipts.append(
                {
                    "store_name": store,
                    "date": date(2026, month, day).isoformat(),
                    "total_amount": amount,
                    "items": [{"name": item, "price": amount, "category": category}],
                }
            )
    return receipts


def main() -> None:
    if MANIFEST_PATH.exists():
        raise SystemExit("Chart demo data has already been added.")

    created_ids = []
    for receipt in build_receipts():
        created_ids.append(post_receipt(receipt))

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(created_ids), encoding="utf-8")
    print(f"Added {len(created_ids)} chart demo receipts.")


if __name__ == "__main__":
    main()
