# LUCID WORKER — MASTER INDEX

**Status:** ACTIVE — Initial Baseline  
**Date:** 2026-08-10

## Purpose

Lucid Worker의 설계·구현 문서를 찾는 최상위 인덱스다.  
세부 내용은 각 문서에 두고, 이 문서는 위치·상태·우선순위만 관리한다.

### 운영 원칙
- 대화창은 작업 공간, 문서는 프로젝트의 기억이다.
- 중요한 결정은 반드시 문서에 기록한다.
- 구현자가 임의로 아키텍처 결정을 추가하지 않는다.
- 새로운 아키텍처 결정이 필요하면 STOP → REPORT → DECISION → IMPLEMENT.

## Documents

| ID | 문서 | 상태 | 역할 |
|---|---|---|---|
| 01 | Product Constitution | ACTIVE / BASELINE | 제품의 목적과 핵심 원칙 |
| 02 | Current State Audit | IN PROGRESS | 실제 현재 시스템의 사실 기준 |
| 03 | Brain & Semantic Intelligence | PLANNED | WHAT 판단 |
| 04 | Design Intelligence | PLANNED | 의미→디자인 판단 |
| 05 | Design Token System | PLANNED | 색상·폰트·간격·레이아웃 토큰 |
| 06 | Renderer Contract | PLANNED | ThemeConfig→실제 화면 |
| 07 | Dashboard / Editor | PLANNED | 사용자 편집·관리 |
| 08 | AI Provider / Cost | PLANNED | Gemini/DeepSeek/호출비용 |
| 09 | Security / Abuse | PLANNED | 인증·쿼터·남용 방어 |
| 10 | Billing / Entitlement | PLANNED | 무료/유료/워터마크 |
| 11 | Domain / Deployment | PLANNED | 서브도메인·사용자 도메인 |
| 12 | Media / Storage | PLANNED | 이미지·R2 |
| 13 | Content / SEO / Social | PLANNED | 콘텐츠·SNS·SEO |
| 14 | Data / Persistence | PLANNED | DB·버전·저장 |
| 15 | Operations / Admin | PLANNED | 운영·모니터링 |
| 16 | Backup / Recovery | PLANNED | 백업·복구 |
| 17 | Product Economics | PLANNED | 원가·수익모델·Exit |
| 18 | Implementation Roadmap | PLANNED | 구현 순서 |
| 19 | Open Decisions | PLANNED | 미결정 사항 |
| 20 | Architecture Changelog | PLANNED | 변경 이력 |

## Current Priority

1. Product Constitution 확정
2. Current State Audit 코드 검증
3. Design Intelligence 설계
4. Renderer 계약 검증
5. Dashboard / Editor 계약 검증
6. Security / Abuse / AI Cost
7. 실제 Production E2E 검증
8. 구현 Roadmap 확정
9. 구현

**원칙: 기능보다 먼저 책임과 계약을 정의한다.**
