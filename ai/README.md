# ReceiptAI AI

영수증 이미지에서 소비 정보를 추출하고, 월별 소비 데이터를 자연어 리포트로 요약하는 AI 모듈입니다.

## 1. 환경 준비

```bash
cd ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2. API 키 설정

`ai/.env.example`을 참고해서 `ai/.env` 파일을 만들고 값을 채웁니다.

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

실제 `.env` 파일은 GitHub에 올리지 않습니다.

## 3. 영수증 이미지 분석 실행

루트 폴더에서 실행합니다.

```bash
python -m ai.receipt_analyzer ai/data/samples/sample1.jpg
```

여러 장을 한 번에 테스트할 수도 있습니다.

```bash
python -m ai.receipt_analyzer ai/data/samples/sample1.jpg ai/data/samples/sample2.jpg
```

## 출력 형식

```json
{
  "store_name": "스타벅스 강남점",
  "date": "2026-08-16",
  "total_amount": 13500.0,
  "items": [
    {
      "name": "아이스 아메리카노",
      "price": 5500.0,
      "category": "카페·간식"
    }
  ]
}
```

카테고리는 `식비`, `카페·간식`, `생활·생필품`, `쇼핑`, `교통`, `의료·건강`, `문화·여가`, `기타` 중 하나만 사용합니다.
