# 서울 공공데이터 API 연결 메모

## 현재 반영한 방향

- 서울 열린데이터광장의 Open API 기본 호출 패턴을 기준으로 수집 스크립트를 구성했다.
- `data/scripts/fetch_seoul_open_data.py`는 `SEOUL_OPEN_API_KEY` 또는 서비스별 서울 키와 서비스명 설정을 사용해 raw JSON을 저장한다.
- `data/scripts/normalize_itda_programs.py`는 복지시설, 예약, 문화행사 데이터를 공통 추천 스키마로 정규화한다.
- 현재 `data/config/seoul_sources.json`에는 확인된 서비스명이 반영되어 있다.

## 준비할 값

- 서울 열린데이터광장 인증키
- 필요 시 서비스별 서울 인증키
- 필요 시 자치구, 날짜, 분류 같은 추가 path 파라미터
- 공공서비스예약 상세 조회에 사용할 `SVCID`

## 파일

- `data/config/seoul_sources.example.json`
- `data/config/seoul_sources.json`
- `data/config/reservation_svcids.example.json`
- `data/scripts/fetch_seoul_open_data.py`
- `data/scripts/fetch_reservation_details.py`
- `data/scripts/normalize_itda_programs.py`
- `docs/references/seoul-service-map.md`

## 운영 순서

1. example 파일을 복사해 `data/config/seoul_sources.json`을 만든다.
2. 각 데이터셋의 실제 `serviceName`을 채운다.
3. `SEOUL_OPEN_API_KEY` 또는 서비스별 서울 키를 설정한 뒤 raw 수집 스크립트를 실행한다.
4. 정규화 스크립트를 실행해 추천용 공통 JSON을 만든다.

## 공공서비스예약 상세 수집

- `ListPublicReservationDetail`는 `SVCID`가 필요하므로 별도 스크립트로 분리했다.
- `data/config/reservation_svcids.example.json`을 복사해 `reservation_svcids.json`을 만든 뒤,
  추천 후보에서 확보한 `SVCID`를 넣어 `python data/scripts/fetch_reservation_details.py`로 상세 데이터를 수집한다.
- 예약 상세 수집은 `SEOUL_API_KEY_PUBLIC_SERVICE_RESERVATIONS`가 있으면 그 키를 우선 사용하고, 없으면 `SEOUL_OPEN_API_KEY`를 사용한다.
