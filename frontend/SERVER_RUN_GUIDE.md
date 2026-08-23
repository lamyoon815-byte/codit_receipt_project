# Spendly 로컬 서버 실행 매뉴얼 (Windows PowerShell)

## 0. 먼저 준비할 것

- 백엔드 담당자에게 `backend`, `ai` 폴더가 포함된 최신 코드를 받습니다.
- Python과 Node.js를 설치합니다.
- 폐기한 키가 아닌 새 OpenAI API 키를 준비합니다.
- OpenAI 키는 프론트엔드가 아닌 백엔드 `.env`에만 저장합니다.

예상 폴더 구조는 다음과 같습니다.

```text
프로젝트-루트/
├─ backend/
│  ├─ app/
│  │  └─ main.py
│  ├─ requirements.txt
│  └─ .env
├─ ai/
│  └─ requirements.txt
└─ (프론트엔드 파일)
```

백엔드와 프론트엔드가 별도 저장소라면 각각 다른 폴더에 있어도 됩니다.

## 1. Python 설치 확인

PowerShell을 열고 실행합니다.

```powershell
py --version
```

버전이 출력되지 않으면 Python을 먼저 설치하고, 설치 과정에서 `Add Python to PATH`를 선택합니다.

## 2. 백엔드 프로젝트 폴더로 이동

아래 경로를 실제 백엔드 프로젝트 최상위 경로로 바꿉니다.

```powershell
Set-Location -LiteralPath "C:\실제\백엔드\프로젝트-루트"
```

필수 폴더가 있는지 확인합니다.

```powershell
Get-ChildItem
Test-Path .\backend\requirements.txt
Test-Path .\ai\requirements.txt
```

두 `Test-Path` 결과가 모두 `True`여야 다음 단계로 진행할 수 있습니다.

## 3. Python 가상환경 생성

프로젝트 최상위 폴더에서 실행합니다.

```powershell
py -m venv .venv
```

PowerShell 실행 정책 문제를 피하기 위해 가상환경을 활성화하지 않고 Python 실행 파일을 직접 사용합니다.

```powershell
& .\.venv\Scripts\python.exe --version
```

## 4. Python 패키지 설치

```powershell
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
& .\.venv\Scripts\python.exe -m pip install -r .\ai\requirements.txt
```

설치는 최초 1회 또는 `requirements.txt`가 변경됐을 때 다시 진행합니다.

## 5. 백엔드 환경 변수 설정

백엔드 담당자가 지정한 위치에 `.env`를 만듭니다. 일반적으로 `backend/.env`를 사용합니다.

```env
OPENAI_API_KEY=새로_발급한_실제_키
```

데이터베이스 주소 등 백엔드 `.env.example`에 다른 항목이 있다면 함께 작성합니다.

주의:

- OpenAI 키를 프론트엔드 `.env`에 넣지 않습니다.
- 키를 Git에 커밋하거나 화면 녹화에 노출하지 않습니다.
- 이전에 외부에 노출된 키를 다시 사용하지 않습니다.

## 6. 백엔드 서버 실행

프로젝트 최상위 폴더에서 다음 명령을 순서대로 실행합니다.

```powershell
Set-Location .\backend
$env:PYTHONPATH = (Resolve-Path '..').Path
& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

다음과 비슷한 문구가 나오면 실행에 성공한 것입니다.

```text
Uvicorn running on http://127.0.0.1:8000
```

이 터미널은 서버가 실행되는 동안 닫지 않습니다.

개발 중 코드 변경을 자동 반영하려면 마지막에 `--reload`를 붙일 수 있지만, 영상 시연 녹화 시에는 안정성을 위해 생략하는 것을 권장합니다.

## 7. 백엔드 동작 확인

브라우저에서 다음 주소를 엽니다.

```text
http://127.0.0.1:8000/docs
```

Swagger 화면이 보이면 서버가 정상적으로 실행된 것입니다.

추가 확인 주소:

```text
http://127.0.0.1:8000/api/receipts/
```

빈 배열 또는 저장된 영수증 목록이 반환되면 프론트엔드에서 호출할 준비가 된 것입니다.

## 8. 프론트엔드 실행

백엔드 터미널은 그대로 두고 새 PowerShell 터미널을 엽니다.

프론트엔드 프로젝트로 이동합니다.

```powershell
Set-Location -LiteralPath "C:\Users\SM-PC\Desktop\Park Jihyun\26-CODE-IT"
npm.cmd install
npm.cmd run dev
```

프론트엔드 `.env`에는 다음 값만 있어야 합니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:5173
```

## 9. 영상 녹화 전 점검

1. 백엔드 `/docs`가 열리는지 확인합니다.
2. 프론트엔드가 열리는지 확인합니다.
3. 영수증 이미지를 한 번 분석해 봅니다.
4. 분석 결과 저장까지 확인합니다.
5. 홈 대시보드의 카드와 그래프가 갱신되는지 확인합니다.
6. AI 소비 리포트 응답 시간을 확인합니다.
7. 화면에 API 키나 `.env` 파일이 보이지 않게 닫습니다.
8. 실패에 대비해 저장된 테스트 데이터가 있는 상태에서 녹화를 시작합니다.

## 10. 종료 방법

프론트엔드와 백엔드를 실행한 각 터미널에서 `Ctrl+C`를 누릅니다.

## 자주 발생하는 오류

### `No module named uvicorn`

패키지가 다른 Python에 설치된 경우입니다.

```powershell
& ..\.venv\Scripts\python.exe -m pip install -r .\requirements.txt
```

### `No module named app` 또는 `No module named ai`

`backend` 폴더에서 실행 중인지와 `PYTHONPATH` 설정을 확인합니다.

```powershell
$env:PYTHONPATH = (Resolve-Path '..').Path
```

### 프론트엔드에 `Failed to fetch` 표시

- 백엔드 터미널이 실행 중인지 확인합니다.
- `http://127.0.0.1:8000/docs`가 열리는지 확인합니다.
- 프론트엔드 `.env`의 API 주소를 확인합니다.
- 백엔드 CORS 설정을 확인합니다.
- `.env` 변경 후 프론트엔드 서버를 재시작합니다.

### 영수증 분석에서 `500` 오류

- 백엔드 `.env`의 `OPENAI_API_KEY`를 확인합니다.
- 키에 결제 한도 또는 프로젝트 권한 문제가 없는지 확인합니다.
- 백엔드 터미널에 출력된 상세 오류를 확인합니다.

