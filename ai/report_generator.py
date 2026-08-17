import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from ai.prompts import REPORT_PROMPT
from ai.receipt_analyzer import DEFAULT_MODEL
from ai.schemas import AIReportResult, MonthlySummaryInput, REPORT_JSON_SCHEMA


def generate_ai_report(
    monthly_summary: dict,
    model: str | None = None,
) -> AIReportResult:
    load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

    selected_model = model or os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    summary = MonthlySummaryInput.model_validate(monthly_summary)
    client = OpenAI()

    response = client.responses.create(
        model=selected_model,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": REPORT_PROMPT},
                    {
                        "type": "input_text",
                        "text": json.dumps(summary.model_dump(mode="json"), ensure_ascii=False),
                    },
                ],
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "ai_report_result",
                "schema": REPORT_JSON_SCHEMA,
                "strict": True,
            }
        },
    )

    data = json.loads(response.output_text)
    return AIReportResult.model_validate(data)
