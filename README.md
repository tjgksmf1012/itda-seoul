# 잇다서울

잇다서울은 서울시 복지, 문화, 예약 데이터를 결합해 고립위험 1인가구와 고령층에게 지금 가장 적합한 다음 외출, 다음 참여, 다음 연결 행동을 추천하는 AI 사회연결 처방 플랫폼입니다.

## 현재 구성

- `frontend/`: React + TypeScript + Vite 기반 사용자 MVP
- `backend/`: Node.js + Express + TypeScript 기반 추천 API 초안
- `docs/proposal/`: 제출용 설명 정리 문서
- `docs/references/`: 데이터 소스 정리
- `data/`: 원천 데이터와 정제 데이터 보관용 디렉터리
- `prompts/`: AI 설명 생성용 프롬프트 템플릿

## 제출용 문서 바로가기

- `docs/proposal/mvp-summary.md`
- `docs/proposal/architecture.md`
- `docs/proposal/api-contract.md`
- `docs/proposal/contest-fit.md`

## 권장 실행

1. 루트에서 의존성을 설치합니다.
2. `frontend`와 `backend` 개발 서버를 각각 실행합니다.
3. 프론트엔드에서 사용자 상태를 입력하고, 백엔드 추천 API와 연결해 결과를 확인합니다.

## 로컬 개발 순서

1. `frontend/.env.example`을 복사해 `.env`를 만들고 `VITE_API_BASE_URL`을 설정합니다.
2. `backend/.env.example`을 복사해 `.env`를 만들고 `PORT`, `DATABASE_URL`을 설정합니다.
3. 루트에서 `npm install`을 실행합니다.
4. 백엔드는 `npm run dev:backend`, 프론트엔드는 `npm run dev:frontend`로 실행합니다.
5. 필요하면 `data/config/seoul_sources.example.json`을 복사해 `data/config/seoul_sources.json`을 만들고,
   `SEOUL_OPEN_API_KEY` 또는 서비스별 서울 키를 설정한 뒤 수집 스크립트를 실행합니다.

## 배포 준비

- 현재 권장 배포 대상은 `Vercel`입니다.
- 가장 안전한 방식은 같은 저장소를 `frontend`, `backend` 두 개의 Vercel 프로젝트로 연결하는 방식입니다.
- 자세한 설정은 `docs/references/vercel-deploy.md`를 참고하면 됩니다.

## 배포 시 필요한 값

- `SEOUL_OPEN_API_KEY` 또는 서비스별 서울 키
- `SEOUL_API_KEY_ELDERLY_WELFARE_FACILITIES`
- `SEOUL_API_KEY_CULTURAL_EVENTS`
- `SEOUL_API_KEY_PUBLIC_SERVICE_RESERVATIONS`
- `DATABASE_URL`
- `APP_ORIGIN`
- `VITE_API_BASE_URL`
- `DATA_GO_KR_SERVICE_KEY`는 현재 구조에선 선택값입니다.

## 데이터 수집 파이프라인

- raw 수집: `python data/scripts/fetch_seoul_open_data.py`
- 정규화: `python data/scripts/normalize_itda_programs.py`
- 설정 참고: `docs/references/api-setup.md`
- 서비스명 매핑 참고: `docs/references/seoul-service-map.md`

## 워크스페이스 구조

```text
itda-seoul/
├─ frontend/
├─ backend/
├─ docs/
│  ├─ proposal/
│  └─ references/
├─ data/
│  ├─ raw/
│  └─ processed/
└─ prompts/
```

## 구현 메모

- 프론트엔드는 정적 데모를 컴포넌트 구조의 React 앱으로 옮겼습니다.
- 백엔드는 `data/processed/programs.normalized.json`이 있으면 그 데이터를 우선 사용하고, 없으면 샘플 프로그램 데이터로 fallback 합니다.
- AI는 추천의 뼈대를 만드는 것이 아니라 설명 문구와 보호자 공유 문구를 생성하는 방향으로 설계했습니다.
- 현재 Open API 기준으로 바로 수집 가능한 항목은 `노인여가복지시설`, `서울시 문화행사 정보`입니다.
- `공공서비스예약 정보`는 공식 명세상 `SVCID`가 필요한 상세 조회형이라 기본 config에서는 비활성화해 두었습니다.
- 기관 화면에서는 대상자 상태를 `대기`, `연락 완료`, `예약 진행`, `참여 완료`로 바꾸고 이력을 남길 수 있습니다.
- 추천 로직은 종료된 후보를 제외하고, 일정이 임박했거나 바로 가능한 후보를 우선 반영하도록 고도화했습니다.
- 현재 저장소 계층은 mock 기반이지만, Prisma 스키마와 환경변수 구조를 함께 준비해 실제 DB로 옮길 수 있게 해두었습니다.

## 현재 제한 사항

- 이 환경에는 `node`, `npm`이 설치되어 있지 않아 실제 실행 검증은 아직 못 했습니다.
- 따라서 지금 상태는 실행 가능한 프로젝트 뼈대와 예시 로직까지 준비된 단계입니다.
