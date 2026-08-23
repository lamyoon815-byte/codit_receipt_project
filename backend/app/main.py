from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse

from app.database import engine, Base
from app.routers import receipts

# SQLite 테이블 자동 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReceiptAI Backend API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipts.router)


# ==========================================
# 공통 에러 응답 형식 통일
# ==========================================
STATUS_CODE_DEFAULTS = {
    400: "BAD_REQUEST",
    404: "NOT_FOUND",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_SERVER_ERROR",
}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    라우터에서 HTTPException(detail={"code": ..., "message": ...}) 형태로 던지면 그대로 사용하고,
    detail이 그냥 문자열이면 상태 코드 기반 기본 code를 붙여서 통일된 형식으로 반환
    """
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        code, message = detail["code"], detail["message"]
    else:
        code = STATUS_CODE_DEFAULTS.get(exc.status_code, "ERROR")
        message = detail if isinstance(detail, str) else str(detail)

    return JSONResponse(status_code=exc.status_code, content={"code": code, "message": message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """FastAPI 자체 422 검증 오류도 동일한 형식으로 통일"""
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "요청 데이터가 유효하지 않습니다.",
            "details": exc.errors(),
        },
    )


@app.get("/")
def root():
    return {"message": "ReceiptAI API Server is running!"}