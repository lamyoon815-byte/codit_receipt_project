"""Spendly 시연용 소비 데이터 생성/삭제 스크립트."""

from __future__ import annotations

import argparse
import json
import random
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

API_BASE_URL = "http://127.0.0.1:8000/api/receipts"
MANIFEST_PATH = Path(__file__).resolve().parents[1] / "data" / "demo_seed_ids.json"
MONTHS = range(3, 9)

CATEGORY_DATA = {
    "FOOD": {
        "stores": ["한솥도시락 숙대점", "본죽 서울역점", "김밥천국 남영점", "BHC치킨 용산점"],
        "items": ["제육도시락", "참치김밥", "닭강정", "비빔밥"],
        "base": 12500,
    },
    "CAFE": {
        "stores": ["스타벅스 숙명여대점", "메가커피 남영점", "투썸플레이스 서울역점"],
        "items": ["아이스 아메리카노", "카페라떼", "샌드위치"],
        "base": 7200,
    },
    "DAILY": {
        "stores": ["올리브영 숙대점", "다이소 서울역점", "GS25 숙대입구점"],
        "items": ["생활용품", "세면용품", "생수"],
        "base": 9800,
    },
    "SHOPPING": {
        "stores": ["무신사 스토어", "에이블리", "쿠팡"],
        "items": ["티셔츠", "문구 세트", "수납용품"],
        "base": 28500,
    },
    "TRANSPORT": {
        "stores": ["카카오택시", "서울교통공사", "따릉이"],
        "items": ["택시 이용", "대중교통 충전", "자전거 이용권"],
        "base": 8600,
    },
    "HEALTH": {
        "stores": ["서울약국", "용산내과", "헬스케어몰"],
        "items": ["상비약", "진료비", "건강보조식품"],
        "base": 22000,
    },
    "CULTURE": {
        "stores": ["CGV 용산아이파크몰", "교보문고 광화문점", "멜론"],
        "items": ["영화 관람", "도서", "음악 이용권"],
        "base": 16500,
    },
    "ETC": {
        "stores": ["기타 지출", "학교 복사실", "코인세탁소"],
        "items": ["기타 결제", "인쇄비", "세탁비"],
        "base": 6500,
    },
}

CATEGORY_SEQUENCE = ["FOOD", "CAFE", "SHOPPING", "TRANSPORT", "DAILY", "FOOD", "CULTURE", "CAFE", "HEALTH", "ETC"]


def request_json(url: str, *, method: str = "GET", payload: dict | None = None):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=body, method=method)
    request.add_header("Accept", "application/json")
    if body is not None:
        request.add_header("Content-Type", "application/json; charset=utf-8")
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status == 204:
            return None
        return json.loads(response.read().decode("utf-8"))


def build_receipts() -> list[dict]:
    random.seed(20260824)
    receipts: list[dict] = []
    for month in MONTHS:
        month_growth = 1 + (month - 3) * 0.075
        for index, category in enumerate(CATEGORY_SEQUENCE):
            meta = CATEGORY_DATA[category]
            # Keep August demo receipts within the presentation date (Aug 24).
            generated_day = 2 + ((index * 3 + month) % 25)
            day = min(generated_day, 24) if month == 8 else generated_day
            item_count = 1 + (index % 3)
            items = []
            for item_index in range(item_count):
                name = meta["items"][(index + item_index + month) % len(meta["items"])]
                variation = random.uniform(0.78, 1.22)
                price = round(meta["base"] * month_growth * variation / item_count / 100) * 100
                items.append({"name": name, "price": max(price, 1000), "category": category})
            receipts.append({
                "store_name": meta["stores"][(index + month) % len(meta["stores"])],
                "date": date(2026, month, day).isoformat(),
                "total_amount": sum(item["price"] for item in items),
                "items": items,
            })
    return receipts


def seed() -> None:
    if MANIFEST_PATH.exists():
        raise SystemExit("이미 생성된 시연 데이터 기록이 있습니다. 먼저 --delete를 실행해 주세요.")
    created_ids: list[int] = []
    try:
        for index, receipt in enumerate(build_receipts(), start=1):
            created = request_json(f"{API_BASE_URL}/", method="POST", payload=receipt)
            created_ids.append(int(created["id"]))
            print(f"[{index:02d}/60] {receipt['date']} {receipt['store_name']}")
    except (urllib.error.URLError, KeyError, ValueError) as error:
        print(f"생성 중 오류: {error}")
        if created_ids:
            MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
            MANIFEST_PATH.write_text(json.dumps(created_ids), encoding="utf-8")
        raise SystemExit(1) from error
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(created_ids), encoding="utf-8")
    print(f"완료: 시연 데이터 {len(created_ids)}건을 생성했습니다.")


def delete() -> None:
    if not MANIFEST_PATH.exists():
        raise SystemExit("삭제할 시연 데이터 기록이 없습니다.")
    ids = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    deleted = 0
    for receipt_id in ids:
        try:
            request_json(f"{API_BASE_URL}/{receipt_id}", method="DELETE")
            deleted += 1
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
    MANIFEST_PATH.unlink()
    print(f"완료: 시연 데이터 {deleted}건을 삭제했습니다.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--delete", action="store_true", help="이 스크립트로 만든 시연 데이터만 삭제")
    args = parser.parse_args()
    delete() if args.delete else seed()
