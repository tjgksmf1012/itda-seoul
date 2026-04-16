# 잇다서울

`잇다서울`은 고립위험 1인가구와 고령층을 위한 AI 사회연결 처방 플랫폼입니다.

서울 열린데이터광장의 복지시설·문화행사·공공서비스예약 데이터를 후보군으로 읽고, 공공데이터포털의 날씨·대기질 시그널로 오늘의 이동 가능성을 보정해 `다음 외출`, `다음 연결`, `다음 신청`을 추천합니다.

## 문제 정의

- 서울시는 외로움·고립을 구조적 사회문제로 다루고 있지만 시민이 체감하는 서비스 경험은 여전히 분절적입니다.
- 복지관 프로그램, 문화행사, 공공서비스예약 데이터는 존재하지만 `지금 이 사람에게 무엇을 먼저 권할지`를 정해주지 못합니다.
- 보호자와 복지현장도 매번 대상자별로 갈 만한 활동, 신청 링크, 다음 안내 문구를 수작업으로 정리해야 합니다.

잇다서울은 이 간극을 메우는 행동 추천형 서비스입니다.

## 서비스 개요

- 사용자 상태 입력
  - 연령대
  - 혼자 지내는지 여부
  - 외출 가능 수준
  - 도보 가능 거리
  - 최근 외출 빈도
  - 보호자 개입 가능 여부
  - 관심 태그
- AI 사회연결 처방
  - 외출 처방
  - 참여 처방
  - 대화 처방
  - 보호자 처방
- 결과
  - 이번 주 첫 외출 후보
  - 바로 신청 가능한 예약형 프로그램
  - 보호자 공유 문구
  - 데이터 출처와 갱신 상태

## 데이터 사용 구조

### 서울 열린데이터광장

- 노인여가복지시설 / 복지 프로그램 후보
- 공공서비스예약 정보
- 문화행사 정보
- 기타 고립위험군 연결에 쓸 수 있는 서울시 복지·문화 데이터

역할:
실제로 갈 수 있는 복지시설, 문화행사, 예약 프로그램의 `후보군`을 만듭니다.

### 공공데이터포털

- 기상청 단기예보
- 에어코리아 대기오염 정보

역할:
오늘 당장 외출이 적절한지, 실내 중심이 나은지, 짧은 이동이 나은지를 결정하는 `도시 시그널`로 사용합니다.

## 프로젝트 구조

- `frontend/`
  - React + TypeScript + Vite 기반 사용자 웹 화면
- `backend/`
  - Express + TypeScript 기반 추천 API
- `data/processed/programs.curated.json`
  - 서울시 후보 프로그램 샘플
- `data/processed/programs.live.json`
  - 서울 열린데이터광장 raw 데이터를 정규화한 실서비스용 후보 카탈로그
- `data/processed/programs.live.meta.json`
  - 후보 카탈로그 생성 시각, 건수, 데이터셋 메타 정보
- `data/processed/city-signals.sample.json`
  - 공공데이터포털 기반 도시 시그널 샘플
- `data/scripts/fetch_city_signals.py`
  - 공공데이터포털 live 시그널 생성 스크립트
- `data/scripts/fetch_seoul_open_data.py`
  - 서울 열린데이터광장 raw 수집 스크립트
- `data/scripts/normalize_itda_programs.py`
  - raw 데이터를 추천용 공통 스키마로 정규화하는 스크립트

## 로컬 실행

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

프론트에서 백엔드를 붙이려면 `frontend/.env`에 아래 값을 설정합니다.

```bash
VITE_API_BASE_URL=http://localhost:4000
```

## 빌드

```bash
npm run build --workspace backend
npm run build --workspace frontend
```

## 데이터 갱신

### 공공데이터포털 시그널

1. `data/config/city_signal_zones.example.json`을 복사해 `data/config/city_signal_zones.json`으로 만듭니다.
2. `DATA_GO_KR_SERVICE_KEY`를 환경 변수로 설정합니다.
3. 아래 스크립트를 실행합니다.

```bash
python data/scripts/fetch_city_signals.py
```

생성 결과는 `data/processed/city-signals.live.json`에 저장되며, 백엔드는 해당 파일이 있으면 샘플보다 우선 사용합니다.

### 서울 열린데이터광장 후보 데이터

1. `data/config/seoul_sources.example.json`을 참고해 `data/config/seoul_sources.json`을 준비합니다.
2. `SEOUL_OPEN_API_KEY` 또는 서비스별 키를 환경 변수로 설정합니다.
3. raw 수집과 정규화를 순서대로 실행합니다.

```bash
python data/scripts/fetch_seoul_open_data.py
python data/scripts/normalize_itda_programs.py
```

정규화 스크립트는 아래 3개 파일을 함께 생성합니다.

- `data/processed/programs.normalized.json`
- `data/processed/programs.live.json`
- `data/processed/programs.live.meta.json`

백엔드는 `programs.live.json`이 있으면 샘플보다 우선 사용합니다.

## 본선 포인트

- 서울 열린데이터광장 1건 이상 활용 + AI 활용 조건에 맞습니다.
- 복지·문화·예약 데이터를 함께 묶어 가점 포인트가 분명합니다.
- 단순 검색이 아니라 `행동 추천`과 `보호자 공유`까지 연결됩니다.
- 복지기관, 방문요양기관, 자치구로 확장 가능한 운영 구조를 보여줄 수 있습니다.
## Official Checklist

- Contest and institution readiness: `docs/proposal/final-readiness.md`
- Template fill draft: `docs/proposal/template-fill-draft.md`
- Submission package plan: `docs/proposal/submission-plan.md`
- Contest-fit memo: `docs/proposal/contest-fit.md`
