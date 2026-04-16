# 잇다서울 모바일 앱 셸 메모

## 현재 적용 상태

- `PWA manifest` 추가
- `service worker` 등록
- 모바일 상단 앱 바 추가
- 모바일 하단 탭 바 추가
- `safe-area-inset-top`, `safe-area-inset-bottom` 반영
- `display: standalone` 기준 설치형 웹앱 동작 준비

## 왜 이 방향인가

잇다서울은 보호자와 기관 담당자가 휴대폰에서 바로 열어 쓰는 비중이 높다.
그래서 브라우저 웹페이지보다 `앱처럼 보이는 셸`이 중요하다.

현재 구조는 다음 두 방향을 모두 열어둔다.

1. `설치형 웹앱(PWA)`
브라우저에서 바로 설치 가능하고, 대회 결과물 링크로도 제출하기 쉽다.

2. `하이브리드 앱 래핑`
추후 `Capacitor` 또는 웹뷰 기반 앱으로 감싸 앱스토어 배포 방향으로 확장할 수 있다.

## 다음 단계

### 1. 앱 래핑

- `Capacitor` 추가
- Android WebView / iOS WKWebView 셸 구성
- 앱 아이콘, 스플래시, 권한 설정 정리

현재 프론트에는 `capacitor.config.ts`와 관련 스크립트를 추가해 두었다.

```bash
npm run build:mobile --workspace frontend
npx cap add android
npm run cap:open:android --workspace frontend
```

### 2. 앱 전용 기능

- 푸시 알림
- 딥링크
- 연락처/공유 연동 강화
- 카카오/문자 발송 후 결과 복귀 흐름 정리

### 3. 운영 안정성

- 로그인/권한관리
- 토큰 저장 전략
- 오프라인/약한 네트워크 대응
- 에러 리포팅

## 대회 제출 관점

대회 결과물은 웹 링크로 제출하되, 발표에서는 아래 메시지로 설명한다.

`잇다서울은 설치형 웹앱(PWA) 구조로 구현되어 앱처럼 사용할 수 있고, 향후 기관/보호자용 하이브리드 앱으로 바로 확장 가능한 제품입니다.`
