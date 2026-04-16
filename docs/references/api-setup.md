# 서울 공공데이터 API 연결 메모

## 현재 반영된 방향

- 서울 열린데이터광장 Open API 호출 스크립트가 준비되어 있다.
- `data/scripts/fetch_seoul_open_data.py`는 환경 변수 기반 API 키를 읽어 raw JSON을 저장한다.
- `data/scripts/normalize_itda_programs.py`는 raw JSON을 읽어
  - `programs.normalized.json`
  - `programs.live.json`
  - `programs.live.meta.json`
  를 함께 생성한다.
- `data/config/seoul_sources.json`에는 서비스별 호출 정보가 들어 있다.

## 준비할 것

- 서울 열린데이터광장 인증키
- 서비스별 상세 인증키가 필요한 경우 해당 환경 변수
- 공공서비스예약 상세 조회용 `SVCID`

## 파일

- `data/config/seoul_sources.example.json`
- `data/config/seoul_sources.json`
- `data/config/reservation_svcids.example.json`
- `data/scripts/fetch_seoul_open_data.py`
- `data/scripts/fetch_reservation_details.py`
- `data/scripts/normalize_itda_programs.py`

## 운영 순서

1. example 파일을 참고해 `data/config/seoul_sources.json`을 준비한다.
2. `SEOUL_OPEN_API_KEY` 또는 서비스별 키를 환경 변수로 설정한다.
3. raw 수집을 실행한다.
4. 정규화 스크립트를 실행해 live 카탈로그를 만든다.

```bash
python data/scripts/fetch_seoul_open_data.py
python data/scripts/normalize_itda_programs.py
```

## 공공서비스예약 상세 수집

- `ListPublicReservationDetail`는 `SVCID`가 필요하므로 별도 스크립트로 분리되어 있다.
- `reservation_svcids.json`을 만들면 `fetch_reservation_details.py`로 상세 예약 데이터를 수집할 수 있다.
