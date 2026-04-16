# 잇다서울 API 계약 초안

## GET /health

- 백엔드 상태 확인용

## POST /api/recommendations

### 요청

```json
{
  "persona": "elder",
  "intent": "outing",
  "state": "low",
  "walkMinutes": 10,
  "interestTags": []
}
```

### 응답

- 추천 타입
- primaryAction
- summary
- shareMessage
- reasons
- actionPlan
- checkInMessage
- supportLevel
- matchScore
- suggestedPrograms

## GET /api/admin/dashboard

- 기관 대시보드 요약 수치
- 대상자 케이스 목록
- 추천기에 바로 반영할 수 있는 preset 정보

## GET /api/admin/cases/:caseId/history

- 선택된 대상자의 추천, 공유, 상태 변경 이력 목록

## PATCH /api/admin/cases/:caseId/status

### 요청

```json
{
  "status": "scheduled",
  "note": "보호자와 통화 후 금요일 프로그램 예약 진행"
}
```

### 응답

- 갱신된 케이스 정보
- 갱신된 대시보드 요약 수치
- 새로 추가된 이력 항목

## GET /api/programs

- `data/processed/programs.normalized.json`이 있으면 그 결과를 우선 사용
- 파일이 없으면 현재 mock 프로그램 목록으로 fallback
