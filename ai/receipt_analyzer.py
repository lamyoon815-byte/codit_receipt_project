import argparse
import base64
import json
import mimetypes
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from ai.prompts import RECEIPT_ANALYSIS_PROMPT
from ai.schemas import RECEIPT_JSON_SCHEMA, ReceiptAnalysisResult


DEFAULT_MODEL = "gpt-5-mini"


def image_to_data_url(image_path: str | Path) -> str:
    path = Path(image_path)
    mime_type, _ = mimetypes.guess_type(path.name)
    if mime_type is None or not mime_type.startswith("image/"):
        raise ValueError(f"지원하지 않는 이미지 형식입니다: {path}")

    encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def analyze_receipt_image(
    image_path: str | Path,
    model: str | None = None,
) -> ReceiptAnalysisResult:
    load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

    selected_model = model or os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    client = OpenAI()
    image_url = image_to_data_url(image_path)

    response = client.responses.create(
        model=selected_model,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": RECEIPT_ANALYSIS_PROMPT},
                    {"type": "input_image", "image_url": image_url, "detail": "high"},
                ],
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "receipt_analysis_result",
                "schema": RECEIPT_JSON_SCHEMA,
                "strict": True,
            }
        },
    )

    data = json.loads(response.output_text)
    result = ReceiptAnalysisResult.model_validate(data)
    result.items = [item for item in result.items if item.price > 0]
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze receipt images with OpenAI Vision.")
    parser.add_argument("images", nargs="+", help="영수증 이미지 파일 경로")
    parser.add_argument("--model", default=None, help=f"OpenAI 모델명, 기본값: {DEFAULT_MODEL}")
    args = parser.parse_args()

    for image in args.images:
        result = analyze_receipt_image(image, model=args.model)
        print(json.dumps(result.model_dump(mode="json"), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
