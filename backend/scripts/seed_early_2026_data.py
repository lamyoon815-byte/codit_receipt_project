"""Add balanced January and February 2026 demo receipts."""

from __future__ import annotations

import json
import urllib.request
from datetime import date
from pathlib import Path


API_URL = "http://127.0.0.1:8000/api/receipts/"
MANIFEST_PATH = Path(__file__).resolve().parents[1] / "data" / "early_2026_seed_ids.json"

CATEGORIES = [
    ("FOOD", "한상 식당", "식사", 48000),
    ("CAFE", "모닝빈 카페", "커피와 디저트", 27000),
    ("SHOPPING", "데일리 편집숍", "쇼핑 상품", 43000),
    ("TRANSPORT", "서울 교통", "교통 이용", 18000),
    ("DAILY", "우리 생활마트", "생활용품", 30000),
    ("HEALTH", "건강 약국", "건강 관리", 36000),
    ("CULTURE", "문화 스테이션", "문화생활", 31000),
    ("ETC", "기타 지출", "기타 결제", 12000),
]


def create_receipt(payload: dict) -> int:
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return int(json.loads(response.read().decode("utf-8"))["id"])


def main() -> None:
    if MANIFEST_PATH.exists():
        raise SystemExit("January/February demo data has already been added.")

    created_ids: list[int] = []
    for month, factor in ((1, 0.88), (2, 0.96)):
        for index, (category, store, item, base_amount) in enumerate(CATEGORIES):
            day = 3 + index * 3
            amount = round(base_amount * factor / 100) * 100
            payload = {
                "store_name": store,
                "date": date(2026, month, day).isoformat(),
                "total_amount": amount,
                "items": [{"name": item, "price": amount, "category": category}],
            }
            created_ids.append(create_receipt(payload))

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(created_ids), encoding="utf-8")
    print(f"Added {len(created_ids)} January/February demo receipts.")


if __name__ == "__main__":
    main()
