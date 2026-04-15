# 오늘서울

`오늘서울`은 서울 시민이 오늘 실제로 갈 만한 공공 프로그램을 추천하는 서비스입니다.

핵심은 두 개의 공공데이터 포털을 역할 분담해 함께 쓰는 점입니다.

- `서울 열린데이터광장`: 문화행사, 공공서비스예약, 복지관 프로그램 같은 후보 데이터
- `공공데이터포털(data.go.kr)`: 기상청 예보, 대기질 같은 당일 도시 컨디션 데이터

이 조합으로 단순 목록 조회가 아니라, “오늘 서울에서 어디 가면 좋지?”에 답하는 생활형 추천 서비스를 만듭니다.

## 왜 본선형인지

- 공공데이터 2개 포털을 억지로 붙이지 않고 명확하게 역할 분리했습니다.
- 서울 시민의 실제 의사결정 흐름에 맞춰 지역구, 동행자, 시간대, 예산, 이동 가능 거리까지 반영합니다.
- 추천 결과에 데이터 출처와 판단 이유가 함께 노출되어 심사 설명력이 좋습니다.

## 현재 제품 구조

- `frontend/`: React + TypeScript + Vite 기반 시민용 추천 화면
- `backend/`: Express + TypeScript 기반 추천 API
- `data/processed/programs.curated.json`: 열린데이터광장 기반 프로그램 후보 샘플
- `data/processed/city-signals.sample.json`: 공공데이터포털 기반 도시 시그널 샘플

## 추천 흐름

1. 사용자가 지역구, 동행자, 목적, 시간대, 예산, 이동 범위를 입력합니다.
2. 백엔드는 서울 열린데이터광장 후보군에서 조건에 맞는 프로그램을 추립니다.
3. 공공데이터포털의 날씨·대기질 시그널로 실내/실외 우선순위를 조정합니다.
4. 최종 추천과 함께 이유, 실행 체크리스트, 데이터 출처를 제공합니다.

## 로컬 실행

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

프론트엔드에서 실제 백엔드를 붙이려면 `frontend/.env`에 아래 값을 설정합니다.

```bash
VITE_API_BASE_URL=http://localhost:4000
```

백엔드 기본 포트는 `4000`입니다.

## 빌드

```bash
npm run build --workspace backend
npm run build --workspace frontend
```

## 공공데이터포털 시그널 갱신

공공데이터포털 키가 있으면 날씨·대기질 기반 도시 시그널을 실제로 생성할 수 있습니다.

1. `data/config/city_signal_zones.example.json`을 복사해 `data/config/city_signal_zones.json`으로 만듭니다.
2. `DATA_GO_KR_SERVICE_KEY`를 환경 변수로 설정합니다.
3. 아래 스크립트를 실행합니다.

```bash
python data/scripts/fetch_city_signals.py
```

생성 결과는 `data/processed/city-signals.live.json`에 저장되고, 백엔드는 이 파일이 있으면 샘플보다 우선해서 읽습니다.

## 데이터 사용 포인트

### 서울 열린데이터광장

- 서울시 문화행사 정보
- 서울시 공공서비스예약 정보
- 서울시 노인복지관 프로그램 정보
- 서울시 청년공간 프로그램 정보

### 공공데이터포털

- 기상청 단기예보 조회서비스
- 에어코리아 대기오염정보 조회서비스

## 확장 방향

- 자치구별 행사/시설 데이터를 실제 API 수집 파이프라인으로 연결
- 혼잡도, 교통, 보행 안전, 폭염/한파 데이터까지 추가
- 서울 시민용 앱과 자치구 운영자용 대시보드 분리
