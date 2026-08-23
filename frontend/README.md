# Spendly Frontend

영수증 이미지를 AI로 분석해 소비 데이터를 기록하고 시각화하는 서비스의 프론트엔드입니다.

## 시작하기

```bash
npm install
npm run dev
```

## 폴더 구조

```text
src/
├─ app/          # 라우팅과 앱 진입 구성
├─ assets/       # 이미지, 폰트 등 정적 자원
├─ components/   # 공통 UI와 레이아웃
├─ constants/    # 카테고리 및 고정 설정
├─ features/     # 도메인별 UI/로직
├─ hooks/        # 공통 React 훅
├─ mocks/        # 개발용 임시 데이터
├─ pages/        # 라우트 화면
├─ services/     # API 통신 모듈
├─ styles/       # 전역 스타일
├─ types/        # 공통 TypeScript 타입
└─ utils/        # 포맷팅 등 순수 유틸리티
```

카테고리 색상은 `src/constants/categories.ts`에서 단일 관리합니다.
