# storage notes

현재 관리자 운영 데이터는 `STORAGE_MODE=database`일 때 Prisma + SQLite를 사용합니다.

기본 동작은 아래 순서입니다.

1. `DATABASE_URL=file:./dev.db` 기준으로 로컬 SQLite 파일을 사용합니다.
2. `adminRepository.ts`가 첫 호출 시 DB가 비어 있으면 mock 케이스와 이력을 seed 합니다.
3. 이후 `/api/admin` 상태 변경은 메모리가 아니라 실제 DB에 저장됩니다.

로컬 준비 순서는 아래와 같습니다.

1. `npm run db:generate --workspace backend`
2. `npm run db:push --workspace backend`
3. `npm run dev:backend`

추후 운영 단계에서는 `DATABASE_URL`만 PostgreSQL로 바꾼 뒤 같은 저장소 계층을 유지할 수 있게 구성했습니다.
