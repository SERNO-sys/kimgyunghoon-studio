# ADR-015: History Integration — OSS Survey Report

Status: APPROVED (Phase 17.9)
Reference: AWIE V2 Architecture Freeze v2, Section 3 (Buy Before Build), Section 4 (What AWIE Owns)

---

## 1. Scope

Phase 17.9 integrates Undo/Redo into the Editor. Per the constitutional mandate
"Buy Before Build", every new client capability must be evaluated against mature
OSS before any custom infrastructure is written. This report covers the two
client-side capabilities that could tempt custom code:

1. **Keyboard shortcut handling** (Ctrl+Z / Ctrl+Shift+Z).
2. **Shared client state** for `canUndo` / `canRedo` (button enablement).

The **history engine itself** (Inverse Patches, CommandHistoryManager) is AWIE IP
and is already built in `src/lib/cms-core/history`. It is NOT re-surveyed here.

---

## 2. Keyboard Shortcut Handling

### Candidate OSS

| Candidate | Version | Maturity | Notes |
|-----------|---------|----------|-------|
| **react-hotkeys-hook** | ^4.x | Mature, widely used | React hook API, `useHotkeys`, `preventDefault`, `enabled` option, scoping. |
| use-hotkeys | ^0.2 | Mature | `useHotkeys` hook, smaller API surface. |
| react-keybind | ^0.9 | Niche | Class-based, less active. |
| hotkeys-js | ^3.x | Mature | Vanilla JS, no React hook wrapper. |

### Why selected

**react-hotkeys-hook** is selected because:

- It is a **React-native hook** (`useHotkeys`), matching the Editor's React
  client. No manual `addEventListener` lifecycle management.
- It supports **`enabled`** toggling, so Undo/Redo shortcuts can be disabled
  when there is nothing to undo/redo (or when the user is typing in the Lexical
  inline editor).
- It supports **`preventDefault`**, so Ctrl+Z does not trigger the browser's
  native undo while the editor is focused.
- It is the most widely adopted React hotkey library (large install base,
  active maintenance), satisfying the "mature OSS" bar.

### Why rejected

- **use-hotkeys**: Rejected because react-hotkeys-hook has a richer option set
  (`enabled`, `preventDefault`, `scopes`) that we need for the inline-editor
  interaction, and a larger community.
- **react-keybind**: Rejected — class-based API, low activity, no `enabled`
  ergonomics.
- **hotkeys-js**: Rejected — vanilla JS; we would have to write the React
  lifecycle wrapper ourselves, which is exactly the custom infrastructure the
  constitution forbids.

### Replacement strategy

react-hotkeys-hook is a **thin WRAP** behind our own `use-history-hotkeys` hook.
The Editor components depend ONLY on `use-history-hotkeys`, never on
react-hotkeys-hook directly. Swapping to use-hotkeys or a future library is a
one-file change.

### Exit strategy

**Replaceable within one week.** The entire react-hotkeys-hook surface is
contained in a single file (`use-history-hotkeys.ts`). Its public contract is
two callbacks (`onUndo`, `onRedo`) plus an `enabled` flag. Any OSS hotkey
library (or a 20-line native `keydown` listener) can satisfy that contract. No
other module imports react-hotkeys-hook.

---

## 3. Shared Client State (canUndo / canRedo)

### Candidate OSS

| Candidate | Version | Maturity | Notes |
|-----------|---------|----------|-------|
| **Zustand** | ^5.x | Mature | Already a dependency (Section 3: State -> Zustand). |
| Jotai | ^2.x | Mature | Atomic state, not currently a dependency. |
| React Context | built-in | N/A | Would require a provider + re-render plumbing. |

### Why selected

**Zustand** is selected because:

- It is **already a dependency** and the constitution's mandated state solution
  (Section 3: State -> Zustand). No new dependency.
- The `canUndo` / `canRedo` flags are **persistent shared client state** that
  must be readable by BOTH the Top Bar buttons AND the hotkey hook. This is the
  exact "persistent shared client state strictly required" case the directive
  permits Zustand for.
- It avoids prop-drilling the flags through the four-zone shell.

### Why rejected

- **Jotai**: Rejected — not a current dependency; Zustand already satisfies the
  requirement with zero new infrastructure.
- **React Context**: Rejected — would require a provider and cause re-renders of
  the whole shell on every history change; Zustand's selector-based subscription
  is more surgical.

### Replacement strategy

The Zustand store (`history-store.ts`) is a **thin WRAP** exposing only
`canUndo`, `canRedo`, and setters. Components depend only on the store's
selectors. Swapping to Jotai or Context is a one-file change.

### Exit strategy

**Replaceable within one week.** The store's public contract is two booleans and
two setters. Any state solution can satisfy it. No business logic lives in the
store.

---

## 4. Custom Infrastructure Justification

The only new client infrastructure is:

- `use-history.ts` — a **TanStack Query `useMutation` WRAP** (mandated by
  Section 3: Async -> TanStack Query). No custom fetch wrapper.
- `use-history-hotkeys.ts` — a **react-hotkeys-hook WRAP** (this report).
- `history-store.ts` — a **Zustand WRAP** (this report).

No custom network state machine, no custom keyboard manager, no custom global
store was written. All three are thin wrappers over mandated/mature OSS.

---

## 5. Conclusion

APPROVED. Proceed with react-hotkeys-hook (keyboard) + Zustand (shared state),
both wrapped behind AWIE-owned thin hooks. Exit strategy confirmed: each can be
replaced within one week.
