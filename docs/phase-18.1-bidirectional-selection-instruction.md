# ⚡ PHASE 18.1 — Bidirectional Selection & Inspector Binding
## DeepSeek Implementation Instruction (v1)

> **작업 방식 (Workflow):**
> - 우리는 벽돌을 만드는 게 아니라, **벽돌을 사와서 집을 짓는다.** 이미 검증된 OSS가 있으면 적극 활용한다. AWIE 고유 IP(결정적 파이프라인, Selection Identity, Composition)만 BUILD한다.
> - 완벽주의로 작업을 잘게 쪼개지 말 것. **필요한 부분만 정밀하게** 하고, 굳이 세밀하게 안 해도 되는 부분은 진행 속도를 올린다.
> - **헌법 위반이면 STOP → 재설계.** 아래 "헌법 체크"를 통과하지 못하는 구현은 하지 않는다.

---

## 0. Mission (Phase 18.1)

**목표:** Canvas ↔ Tree ↔ Inspector ↔ TopBar 사이의 선택(Selection)을 **이벤트 기반 양방향(bidirectional)** 으로 연결한다. 현재는 Shell이 콜백을 직접 prop-drilling 하는 단방향 구조다. 이를 **Section 13의 Selection Events** (SelectionChanged / SelectionCleared / SelectionHovered / SelectionFocused) 기반으로 재구성한다.

**핵심 원칙 (FROZEN):**
- Selection Identity = **Semantic Component Identity** (`hero`, `hero.title`). DOM id / React key / RenderNode id / tree index / runtime UUID **절대 금지**.
- Selection은 **SelectionSnapshot**으로만 노출된다. UI는 컴포넌트 객체를 공유하지 않는다.
- UI 컴포넌트는 서로를 직접 조작하지 않는다. **모든 것은 이벤트로 흐른다.**
- Editor는 **Dumb Client**. ThemeConfig를 절대 보유/변경하지 않는다. 서버가 유일한 오케스트레이터.

---

## 1. Current State (현재 아키텍처 분석)

### 1.1 Selection 상태의 현재 위치
- **`src/components/admin/editor/EditorShell.tsx`** — `selectedComponentId`를 `useState<string | null>`로 보유. `SelectionModel.resolve(renderNode, selectedComponentId)`로 `SelectionSnapshot`을 파생. `handleSelect(semanticId)`가 유일한 양방향 진입점.
- **`src/components/admin/editor/selection-model.ts`** — 순수/무상태 모델. `SelectionModel.resolve()` + `SelectionModel.flattenTree()`. Semantic Component Identity로만 해석. (이미 완성, **수정 금지**)
- **`src/components/admin/editor/types.ts`** — `SelectionSnapshot`, `SelectionCrumb`, `SelectionGeometry`, `SelectionTreeEntry` 재-export. (이미 완성, **수정 금지**)

### 1.2 Canvas (이미 구현됨)
- **`src/components/admin/editor/EditorCanvas.tsx`** — `data-awie-id` DOM 조회로 클릭 선택, 선택 오버레이, 인라인 편집, 드래그앤드롭. `selection` + `onSelectNode` prop 수신.
- **`src/lib/renderer-react/selection-instrumented-adapter.tsx`** — `data-awie-id` 주입 (Semantic Component Identity propagator). (이미 완성, **수정 금지**)

### 1.3 Inspector (이미 구현됨)
- **`src/components/admin/editor/EditorRightSidebar.tsx`** — `PropertyAdapter.resolve(selection)` → `PropertyAdapterOutput` → React Hook Form. `content.update-property` 커맨드 발행.
- **`src/components/admin/editor/property-adapter.ts`** — PropertySchema → UI-agnostic PropertyDescriptor 변환. (이미 완성, **수정 금지**)

### 1.4 현재의 갭 (Phase 18.1이 해결할 것)
| 방향 | 현재 상태 |
|------|-----------|
| Canvas → Inspector | ✅ 동작 (클릭 → selection → inspector) |
| Tree → Canvas | ✅ 동작 (`handleSelect` 공유) |
| Inspector → Canvas | ⚠️ 서버 왕복으로만 반영 (커맨드 → 새 RenderNode) |
| **이벤트 버스** | ❌ **없음.** Shell이 콜백을 직접 prop-drilling. Section 13의 Selection Events 미구현 |

**핵심 결론:** Phase 18.1의 본질은 **Selection Event Bus 도입**이다. Section 13이 "UI 컴포넌트는 서로를 직접 조작하지 않는다. 모든 것은 이벤트로 흐른다"고 명시했는데, 현재는 Shell이 직접 콜백을 내려주는 구조다.

---

## 2. Integration Plan (구현 전략)

### 2.1 새 파일: `src/components/admin/editor/selection-events.ts` (BUILD — AWIE IP)

Section 13의 Selection Events를 **타입 안전한 이벤트 버스**로 모델링한다. **Zustand를 WRAP**한다 (Buy Before Build — 이미 프로젝트에 Zustand 사용 중).

```ts
// Selection Events (Section 13, FROZEN)
export type SelectionEvent =
  | { type: 'SelectionChanged'; semanticId: string | null }
  | { type: 'SelectionCleared' }
  | { type: 'SelectionHovered'; semanticId: string | null }
  | { type: 'SelectionFocused'; semanticId: string | null };
```

**설계 원칙:**
- 이벤트 버스는 **Semantic Component Identity만** 운반한다. 컴포넌트 객체, RenderNode, ThemeConfig를 절대 운반하지 않는다.
- 이벤트 버스는 **Dumb Client 상태만** 보유한다: `selectedComponentId` (pure UI state). ThemeConfig를 절대 보유하지 않는다.
- **Zustand store**로 구현 (이미 `autosave-store.ts`가 Zustand 사용 중 — 동일 패턴). 새 의존성 불필요.

### 2.2 `EditorShell.tsx` 리팩터링 (최소 변경)

- `selectedComponentId`의 `useState`를 **Zustand selection store로 대체**.
- `handleSelect`를 **`SelectionChanged` 이벤트 발행**으로 대체.
- `SelectionSnapshot`은 여전히 `SelectionModel.resolve(renderNode, selectedComponentId)`로 파생 (변경 없음).
- **주의:** 이 리팩터링은 최소화한다. Shell의 4-zone 레이아웃, Autosave, History, DnD는 **건드리지 않는다.**

### 2.3 Canvas / Tree / Inspector / TopBar — 이벤트 구독으로 전환

각 zone은 **직접 콜백 prop 대신 이벤트를 구독**한다:
- **Canvas** (`EditorCanvas.tsx`): 클릭 시 `SelectionChanged` 발행. `SelectionHovered` 발행 (hover 오버레이). `SelectionFocused` 발행 (인라인 편집 진입).
- **Tree** (`EditorLeftSidebar.tsx`): 노드 클릭 시 `SelectionChanged` 발행.
- **Inspector** (`EditorRightSidebar.tsx`): `SelectionChanged` 구독 → `PropertyAdapter.resolve()` 재실행. (이미 selection prop으로 동작하므로, prop을 store 구독으로 교체)
- **TopBar** (`EditorTopBar.tsx`): breadcrumb 클릭 시 `SelectionChanged` 발행.

**중요:** 이벤트 버스 도입은 **동작을 바꾸지 않는다.** 기존의 prop-drilling 콜백을 이벤트 구독으로 **동등하게 대체**하는 것뿐이다. Canvas의 클릭→선택, Tree의 클릭→선택, Inspector의 바인딩은 **이미 동작하므로** 그대로 유지한다.

### 2.4 Inspector → Canvas 반영 (서버 왕복 유지)

Inspector의 속성 편집은 **이미 커맨드 → 서버 → 새 RenderNode**로 반영된다. 이 흐름은 **변경하지 않는다.** Phase 18.1은 이벤트 버스 도입이지, 서버 왕복을 제거하는 것이 아니다. (Dumb Client 규칙 유지)

---

## 3. OSS / State Check (의존성 판단)

| 후보 | 판단 | 근거 |
|------|------|------|
| **Zustand** | ✅ **WRAP (이미 사용 중)** | `autosave-store.ts`가 이미 Zustand 사용. 새 의존성 불필요. Selection Event Bus를 Zustand store로 구현. |
| **Zustand 미들웨어 (subscribeWithSelector)** | ✅ 선택적 | 특정 semanticId만 구독할 때 유용. 필요 시에만. |
| **새 이벤트 라이브러리 (mitt, eventemitter3 등)** | ❌ **불필요** | Zustand store가 이미 구독/발행을 제공. 벽돌을 새로 살 필요 없음. |
| **React Context** | ❌ **지양** | prop-drilling을 Context로 옮기는 것뿐, 이벤트 모델이 아님. Section 13의 "이벤트로 흐른다"와 불일치. |

**결론:** **새 의존성 없음.** Zustand (기존)로 Selection Event Bus를 구현한다.

---

## 4. 헌법 체크 (Constitution Check)

구현 전 반드시 통과해야 한다:

| 규칙 | 체크 |
|------|------|
| **Dumb Client** | ✅ 이벤트 버스는 semanticId만 운반. ThemeConfig 미보유. |
| **Immutable ThemeConfig** | ✅ 이벤트 버스는 ThemeConfig를 절대 변경하지 않음. |
| **Semantic Component Identity** | ✅ 이벤트는 semanticId만 사용. DOM id / React key / RenderNode id / tree index 금지. |
| **SelectionSnapshot만 노출** | ✅ UI는 SelectionSnapshot만 소비. 컴포넌트 객체 공유 금지. |
| **이벤트 기반 통신** | ✅ Section 13의 Selection Events 도입. UI가 서로 직접 조작하지 않음. |
| **Zero Core Imports** | ✅ Core(ThemeConfig, Renderer)를 수정하지 않음. |
| **Thin Wrapper** | ✅ Zustand WRAP. 새 네트워크 상태 머신 없음. |
| **Replaceability** | ✅ 이벤트 버스는 교체 가능한 WRAP 레이어. |

---

## 5. Deliverables (구현 산출물)

1. **`src/components/admin/editor/selection-events.ts`** (신규) — Selection Event 타입 + Zustand store (SelectionChanged / SelectionCleared / SelectionHovered / SelectionFocused).
2. **`src/components/admin/editor/EditorShell.tsx`** (최소 수정) — `useState` → Zustand store 구독. `handleSelect` → `SelectionChanged` 발행.
3. **`src/components/admin/editor/EditorCanvas.tsx`** (수정) — 클릭 → `SelectionChanged`, hover → `SelectionHovered`, 인라인 편집 진입 → `SelectionFocused`.
4. **`src/components/admin/editor/EditorLeftSidebar.tsx`** (수정) — 노드 클릭 → `SelectionChanged`.
5. **`src/components/admin/editor/EditorRightSidebar.tsx`** (수정) — selection prop → store 구독.
6. **`src/components/admin/editor/EditorTopBar.tsx`** (수정) — breadcrumb 클릭 → `SelectionChanged`.
7. **`src/components/admin/editor/index.ts`** (수정) — selection-events export.
8. **`scripts/selection-events-constitution.test.ts`** (신규) — 헌법 테스트: 이벤트가 semanticId만 운반하는지, ThemeConfig 미보유인지, 금지된 identity를 사용하지 않는지 검증.

---

## 6. 구현 순서 (속도 우선)

1. `selection-events.ts` 생성 (Zustand store + 이벤트 타입).
2. `EditorShell.tsx` 최소 리팩터링 (useState → store).
3. Canvas / Tree / Inspector / TopBar를 이벤트 구독으로 전환.
4. 헌법 테스트 작성.
5. `npx tsc --noEmit` 통과 확인.

> **속도 지침:** 이벤트 버스 도입은 **동작 변경이 아니라 구조 변경**이다. 기존 동작(클릭→선택, 트리→선택, 인스펙터 바인딩)을 **그대로 유지**하면서 통신 방식을 이벤트로 바꾸는 것에 집중한다. 불필요한 리팩터링, 스타일 변경, 주석 과잉은 하지 않는다.

---

## 7. 금지 사항 (Do NOT)

- ❌ `selection-model.ts`, `types.ts`, `property-adapter.ts`, `selection-instrumented-adapter.tsx` **수정 금지** (이미 완성, FROZEN).
- ❌ Core (ThemeConfig, Renderer, Runtime) **수정 금지**.
- ❌ 새 의존성 추가 금지 (Zustand로 충분).
- ❌ DOM id / React key / RenderNode id / tree index를 selection identity로 사용 금지.
- ❌ 이벤트 버스에 RenderNode / 컴포넌트 객체 / ThemeConfig를 실어 보내기 금지.
- ❌ Inspector → Canvas 반영을 위해 서버 왕복을 제거하거나 클라이언트에서 직접 ThemeConfig를 변경 금지.

---

## 8. 완료 정의 (Definition of Done)

- [ ] `selection-events.ts` 생성 (Selection Events + Zustand store).
- [ ] Shell / Canvas / Tree / Inspector / TopBar가 이벤트 기반으로 통신.
- [ ] 기존 동작 (클릭→선택, 트리→선택, 인스펙터 바인딩) 그대로 유지.
- [ ] 헌법 테스트 통과.
- [ ] `npx tsc --noEmit` 에러 0.
