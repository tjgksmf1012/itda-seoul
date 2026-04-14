# 서울 Open API 서비스명 매핑

## 확정한 항목

- 노인여가복지시설
  - 데이터셋: `OA-20412`
  - 서비스명: `fcltOpenInfo_OWI`
  - 샘플 패턴: `/sample/xml/fcltOpenInfo_OWI/1/5/`

- 서울시 문화행사 정보
  - 데이터셋: `OA-15486`
  - 서비스명: `culturalEventInfo`
  - 샘플 패턴: `/sample/xml/culturalEventInfo/1/5/`

## 보류 항목

- 공공서비스예약 정보
  - 데이터셋: `OA-2271`
  - 확인된 서비스명: `ListPublicReservationDetail`
  - 특이사항: `SVCID`가 필요한 상세 조회형 명세로 확인됨
  - 기본 수집 config에서는 비활성화 상태로 두고, 추천 후보에서 확보한 `SVCID`를 넣을 때 활성화하는 방식 권장

## 운영 메모

- `data/config/seoul_sources.json`에는 현재 확정된 값만 반영했다.
- 추후 공공서비스예약 목록형 API나 안정적인 대체 원천을 찾으면 해당 항목을 교체한다.
