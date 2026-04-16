# Outreach Provider Setup

`잇다서울` 기관 운영 화면의 `실제 발송` 버튼은 현재 `SOLAPI` 기준으로 준비되어 있습니다.

## 왜 SOLAPI인가

- 문자(SMS/LMS/MMS)와 카카오 알림톡을 한 공급자에서 다룰 수 있습니다.
- 한국 기관이 바로 붙이기 쉬운 메시지 인프라입니다.
- 현재 백엔드는 `mock`/`solapi` 전환 구조로 되어 있어 키만 넣으면 실발송으로 바꿀 수 있습니다.

## 지금 필요한 값

`.env` 또는 배포 환경변수에 아래 값을 넣으면 됩니다.

- `OUTREACH_PROVIDER=solapi`
- `SOLAPI_API_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_NUMBER`

카카오 알림톡까지 실제로 보내려면 아래도 추가로 필요합니다.

- `SOLAPI_KAKAO_PFID`
- `SOLAPI_KAKAO_TEMPLATE_ID`

## 어디서 발급하나

- SOLAPI 시작하기: [https://console.solapi.com](https://console.solapi.com)
- SOLAPI 개발자 문서: [https://solapi.com/developers](https://solapi.com/developers)
- 문자/알림톡 상품 소개: [https://solapi.com/msg](https://solapi.com/msg)

## 카카오 알림톡 주의

카카오 알림톡은 API 키만으로 바로 되는 채널이 아닙니다.

- 카카오 비즈니스 채널 개설
- SOLAPI 채널 연동
- 템플릿 등록 및 검수
- 검수 완료 템플릿으로 발송

SOLAPI 공개 안내에도 이 순서가 명시되어 있습니다.

## 현재 구현 상태

- `phone`
  - 실통화 연동 없이 운영 이력 저장용
- `sms`
  - `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`이 있으면 실발송 가능
- `kakao`
  - 화면/이력 구조와 환경변수는 준비됨
  - 실제 발송은 카카오 채널/템플릿 준비 후 연결 예정

## 추천 준비 순서

1. SOLAPI 계정 생성 후 API Key / API Secret 발급
2. 발신번호 등록
3. `.env`에 `OUTREACH_PROVIDER=solapi`와 키 입력
4. 문자 채널부터 실발송 확인
5. 그 다음 카카오 비즈니스 채널과 템플릿 검수 진행
