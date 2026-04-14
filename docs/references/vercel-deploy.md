# Vercel 배포 가이드

## 권장 구조

현재 기준으로 가장 안전한 방식은 같은 Git 저장소를 Vercel 프로젝트 2개로 연결하는 것이다.

- 프론트엔드 프로젝트
  - Root Directory: `frontend`
  - Framework Preset: Vite

- 백엔드 프로젝트
  - Root Directory: `backend`
  - Framework Preset: Express 또는 Other
  - 엔트리포인트: `src/index.ts`

이 방식은 Vercel 공식 monorepo 문서 기준으로 지원되는 일반적인 구성이다. 한 저장소를 여러 프로젝트에 연결할 수 있다.

## 왜 단일 프로젝트가 아닌가

- Vercel `Services` 기능은 공식 문서 기준 Private Beta다.
- 지금 단계에서는 베타 기능보다, 프론트와 백엔드를 각각 독립 배포하는 구성이 더 안정적이다.

## 프론트엔드 환경변수

- `VITE_API_BASE_URL`
  - Preview: 백엔드 Preview URL
  - Production: 백엔드 Production URL

## 백엔드 환경변수

- `PORT`
- `APP_ORIGIN`
- `DATABASE_URL`
- `SEOUL_OPEN_API_KEY` 또는 서비스별 서울 키
- `SEOUL_API_KEY_ELDERLY_WELFARE_FACILITIES`
- `SEOUL_API_KEY_CULTURAL_EVENTS`
- `SEOUL_API_KEY_PUBLIC_SERVICE_RESERVATIONS`
- `STORAGE_MODE`
- `DATA_GO_KR_SERVICE_KEY`
  - 현재 구조에서는 선택값이다.

## 추천 연결 순서

1. 백엔드 프로젝트를 먼저 생성한다.
2. 백엔드 Production URL을 확인한다.
3. 프론트 프로젝트의 `VITE_API_BASE_URL`에 백엔드 URL을 넣는다.
4. Preview 환경도 같은 방식으로 연결한다.

## 참고

- Vercel 공식 문서 기준, Express는 Vercel에 배포할 수 있고 `src/index.ts`에서 앱을 export 하는 방식이 지원된다.
- Vercel 공식 문서 기준, monorepo에서는 하나의 저장소를 여러 Vercel 프로젝트에 연결할 수 있다.
