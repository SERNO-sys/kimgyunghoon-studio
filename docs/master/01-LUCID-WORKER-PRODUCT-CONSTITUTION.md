# LUCID WORKER — PRODUCT CONSTITUTION

**Status:** BASELINE — Draft for Review  
**Date:** 2026-08-10  
**Authority:** Lead Architect / Product Owner Decision Document

## 1. Product Definition

Lucid Worker는 사용자가 복잡한 웹 제작 지식 없이 짧은 자연어 입력 하나로 사업에 맞는 홈페이지를 만들고, 이후 대시보드에서 수정·운영할 수 있도록 하는 홈페이지 빌더다.

핵심 흐름:

`1줄 입력 → 의미 분석 → 기능/콘텐츠 결정 → 디자인 결정 → 홈페이지 조립 → 대시보드 편집 → 배포`

## 2. Product Goal

목표는 단순한 템플릿 선택기가 아니다.

사용자의 입력에 따라 정보 구조, 기능, 콘텐츠, 시각적 표현을 달리하여 **사업별로 다른 홈페이지**를 만드는 것이 핵심 가치다.

따라서 다음을 제품의 핵심 해결책으로 보지 않는다.

- 기존 테마 중 하나를 임의 선택
- 항상 동일한 메뉴 출력
- AI가 임의 HTML/CSS를 생성
- 사용자에게 웹 제작 지식 요구

## 3. Brain의 역할

Brain은 사업의 의미를 이해하고 **WHAT**을 결정한다.

판단 대상:
- 사업 목적
- 고객/대상
- 필요한 정보
- 필요한 기능
- 필요한 메뉴
- 콘텐츠 성격
- 신뢰 요소
- CTA 성격
- 정보 우선순위
- 콘텐츠 제약

Brain이 직접 생성하지 않는 것:
- HTML/CSS
- React 구현 코드
- 임의 HEX/CSS
- 임의 폰트 파일
- 임의 pixel layout

## 4. Design Intelligence

Design Intelligence는 Brain의 사업 의미를 실제 디자인 시스템의 선택으로 연결한다.

`사업 의미 → 업종/분위기/대상/목적 → Design Intelligence → 등록된 Color/Typography/Spacing/Layout/Component 선택 → ThemeConfig → Renderer`

원칙:
- 임의 CSS 창조를 기본 방식으로 삼지 않는다.
- 시스템에 등록된 디자인 토큰과 패턴을 조합한다.
- 어떤 토큰과 패턴을 어떤 근거로 선택하는지가 핵심 설계 대상이다.

## 5. Renderer

Renderer는 이미 결정된 ThemeConfig와 콘텐츠를 실제 화면으로 표현한다.

Renderer는 사업 의미를 다시 판단하지 않는다.

`Brain / Recipe / Design Intelligence → ThemeConfig → Renderer → 실제 홈페이지`

## 6. User Editing

사용자는 홈페이지를 수정할 수 있어야 한다.

원칙:
- 사용자 편집권을 존중한다.
- 존재하지 않는 사실을 만들어내는 편집은 허용하지 않는다.
- 시스템 무결성을 깨는 변경은 방어한다.
- 사이트 초기화/회원정보 삭제 같은 파괴적 작업은 명시적 확인을 요구한다.

세부 정책은 Dashboard / Editor 문서에서 확정한다.

## 7. AI 역할 분리

- **Brain:** 사업 의미와 필요한 구조 판단
- **AI #2 / Content Expression:** Brain의 범위 안에서 콘텐츠 표현
- **Design Intelligence:** 의미를 디자인 시스템 선택으로 연결
- **Renderer:** 결정된 결과를 실제 UI로 표현

거대한 단일 프롬프트가 모든 것을 결정하는 구조를 목표로 하지 않는다.

## 8. One-Line Input

1줄 입력만으로 생성이 가능해야 한다.

입력이 짧으면 알려진 사실만 사용한다.

예: `카페`

알 수 없는 위치·가격·영업시간·메뉴·연락처 등을 사실처럼 발명하지 않는다. 필요한 경우 generic-safe 표현을 사용한다.

## 9. Existing Product Assets

사용자 제공 현황으로 다음 자산이 존재했거나 존재한다. 구현 상태는 Current State Audit에서 코드로 검증한다.

- Google 로그인
- 기존 사이트 확인 후 이동
- 신규 생성
- 수동 입력 / 1줄 입력
- About / Diary / Contact
- 입력값에 따른 추가 메뉴 자동 생성
- AI 문구 생성
- 대시보드 홍보 문구/레이아웃 생성
- 사용자가 입력한 SNS만 아이콘/링크 생성
- 사이트 초기화
- 회원정보 초기화
- 이미지 Drag & Drop
- 5MB 제한
- 이미지 압축 저장
- GitHub → Cloudflare 배포

## 10. SNS Links

사용자가 입력한 SNS만 표시한다.

예:
- YouTube 입력 → YouTube 아이콘 + 링크
- Instagram 입력 → Instagram 아이콘 + 링크
- 둘 다 입력 → 둘 다 표시
- 입력하지 않은 SNS는 생성하지 않는다.

이 기능은 Brain의 사업 판단과 별개의 제품 기능이다.

## 11. AI Cost Principle

AI 호출은 가치가 있는 작업에 한정한다.

우선 검토 대상:
- 최초 홈페이지 생성
- 사용자가 명시한 AI 재생성/변경

단순 조회·저장·일반 편집에 불필요한 AI 호출을 넣지 않는다.

무료/유료 정책과 Gemini/DeepSeek 선택은 실제 호출 위치와 비용을 파악한 뒤 결정한다.

## 12. Security Principle

AI 비용이 발생하므로 abuse 방어는 제품 설계의 일부다.

필수 검토:
- 인증/권한
- 요청 제한
- AI quota
- 봇/자동화 공격
- API key 보호
- 관리자 기능 보호
- 사이트/회원 삭제 보호
- 사용자 데이터 격리

## 13. Destructive Operations

사이트 초기화와 회원정보 초기화는 테스트용으로 존재할 수 있지만 일반 사용자에게 무방비로 노출하지 않는다.

최종 제품에서는 명확한 경고, 확인 절차, 권한 검증, 필요시 대상명 입력 및 복구 가능성을 검토한다.

## 14. Domain / Deployment

사용자 경험은 가능한 한 다음과 같아야 한다.

`홈페이지 생성 → 임시 주소 → 사용자 도메인 보유 시 연결 → 배포`

DNS/Cloudflare 자동화의 구체적 방식은 별도 문서에서 결정한다.

## 15. Monetization Direction

우선순위는 제품 가치와 사용성 검증이다.

검토 가능한 모델:
- 무료 사용
- 유료 기능
- 워터마크 제거
- AI 사용량 차등
- 도메인/고급 기능
- 향후 BGM 등 부가 기능
- 장기적인 제품 Exit

실제 채택 여부는 원가와 운영비를 계산한 뒤 결정한다.

## 16. Exit / Transferability

장기적으로 다른 사업자에게 이전하거나 매각할 가능성을 배제하지 않는다.

따라서:
- AI Provider 교체 가능성
- 명확한 데이터 구조
- 문서화
- 재현 가능한 배포
- 백업/복구
- 운영 절차

를 중요하게 취급한다.

## 17. Architecture Boundary

`INPUT → BusinessBrief → BRAIN(WHAT) → RECIPE/SYSTEM(HOW) → DESIGN INTELLIGENCE(DESIGN CHOICE) → THEME_CONFIG → RENDERER → USER WEBSITE`

각 계층은 자신의 책임을 넘어서는 판단을 하지 않는다.

## 18. Change Control

다음 변경은 구현자가 임의로 결정하지 않는다.

- Brain 책임 변경
- 새로운 AI 의사결정 계층 추가
- Renderer 책임 변경
- 새 데이터 모델
- 기존 API 경로 변경
- AI Provider 전략 변경
- 과금 정책
- 보안 정책
- 사용자 편집권
- 도메인 연결 정책

필요 시:

**STOP → REPORT → ARCHITECT DECISION → IMPLEMENT**

## 19. Development Rule

현재는 기능을 무작정 추가하는 단계가 아니다.

1. 현재 시스템을 정확히 파악한다.
2. 기존 자산을 우선 재사용한다.
3. 잃어버린 기능과 새 설계를 구분한다.
4. Brain과 Design Intelligence 책임을 확정한다.
5. Renderer 계약을 확정한다.
6. Security / Cost / Domain / Billing을 설계한다.
7. 그 후 구현한다.

## 20. Non-Goals

현재 단계에서 하지 않는다.

- 또 다른 Brain을 만드는 것
- 기존 기능 확인 없이 재구현
- 임의 디자인 템플릿 계속 추가
- AI의 직접 HTML/CSS 생성
- 이유 없는 Provider 교체
- 대규모 리팩터링
- 보고서만 보고 기존 기능 삭제

## Final Principle

Lucid Worker는 단순히 “AI가 홈페이지 하나를 만들어주는 프로그램”이 아니다.

**사용자의 짧은 의도를 이해하고, 그 의도에 맞는 정보 구조·기능·콘텐츠·디자인을 결정하여 실제 운영 가능한 고유한 홈페이지로 조립해 주는 시스템**이다.

그 판단의 핵심은 구현자의 임의 판단이 아니라 명시된 Product Constitution과 Brain / Design Intelligence 규칙에 의해 결정되어야 한다.
