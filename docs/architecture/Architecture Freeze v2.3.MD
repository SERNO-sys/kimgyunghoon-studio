\# 🧊 Product Freeze v2.3 — Publishing \& Delivery Architecture



\## 1. Frozen Architectural Decisions (핵심 동결 자산)

\- \*\*Release Pointer Architecture:\*\* Publish(스냅샷 생성)와 Release(라이브 지정) 분리. 롤백 시 포인터만 재지정.

\- \*\*Immutable VersionSnapshot:\*\* 발행된 스냅샷은 절대 수정되지 않음.

\- \*\*Delivery Cache \& Thin Wrapper:\*\* `DeliveryCache`를 통한 캐시 로직 단일화 및 Serve Route의 Thin Wrapper화.

\- \*\*Deterministic ETag:\*\* 타임스탬프가 아닌 버전을 ETag로 사용하여 캐시 효율성 극대화.

\- \*\*Lazy-Flip Scheduled Publishing:\*\* Worker 의존성 없이 읽기 경로에서 스케줄 시간을 판단하는 지연 전환 아키텍처.

\- \*\*Buy Before Build \& Runtime Purity:\*\* 비즈니스 로직 오염 없이 기존 기능(`repository.release()`) 재사용.



\## 2. Milestone I Candidates (Next Steps)

1\. \*\*Admin UI Wiring:\*\* 서버에 구현된 Version History / Rollback / Release 기능을 관리자 UI에 연결.

2\. \*\*Versioned Snapshot URLs:\*\* 특정 스냅샷을 영구적으로 불러오는 `/serve?v=snapshotId` 엔드포인트 구현.

3\. \*\*Durable Persistence:\*\* UI 검증 완료 후 InMemory에서 Cloudflare D1으로 저장소 전환.

