# storage notes

현재 `adminRepository.ts`는 mock 데이터를 사용하는 메모리 저장소입니다.

실배포 단계에서는 아래 순서로 교체합니다.

1. Prisma Client 생성
2. `AdminCase`, `AdminHistory`, `UserProfile`, `Recommendation` 모델을 실제 DB에 마이그레이션
3. `adminRepository.ts`를 Prisma 기반 구현으로 교체
4. `STORAGE_MODE=database`일 때 Prisma 저장소를 사용하도록 연결
