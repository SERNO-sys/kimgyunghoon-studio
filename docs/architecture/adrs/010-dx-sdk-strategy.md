# ADR 010 — Developer Experience & SDK Strategy (Phase 16.5)

> **Status:** Approved (AR-1) — API Naming Freeze
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Developer Experience (DX) & Plugin SDK
> **Scope:** Research + Implementation. This ADR evaluates the OSS landscape for
> the three DX capabilities that make AWIE a true Framework: the **Plugin CLI**,
> the **Plugin Linter / Validator**, and the **Plugin Test Harness**. It then
> FREEZES the public API names and the Validator UX pattern.

>
> **Constitutional Rule (ADR-010):**
> > **"If creating a plugin is too hard for a new developer, the framework
> > fails. The DX layer MUST make the Core Constitution effortless to obey,
> > not a burden to remember."**
>
> The DX layer is a **facilitator**, never a bypass. It must make it *easier* to
> write a compliant plugin than to write a violating one. Every tool in this
> ADR exists to enforce the frozen Core Constitution (ADR-007 Buy Before Build,
> ADR-008 Runtime Purity, Zero Core Imports) **statically and offline** — before
> a plugin ever reaches the Runtime.
>
> **Enhanced AR-0 Process (Business-Aware):**
> Every OSS evaluation below includes not just technical fit, but also the
> **Business constraints**: License, Maintenance, Cost, and Exit Strategy. The
> comparison tables follow the mandated schema:
> `OSS | License | Maintenance | Cost | Exit Strategy | Decision (Buy/Wrap/Build)`.

---

## Context

The AWIE V2 Core Engine is frozen (v2.0.0). Phase 16 (Runtime Foundation) is
approved. Phase 17 (Admin Platform) is **HALTED**. The Architecture Review
Board has redirected to **Phase 16.5: Developer Experience & Plugin SDK**.

The rationale is decisive: AWIE has evolved from a Website Builder into a true
**Framework**. A framework's value is measured by its ecosystem. If a new
developer cannot scaffold, validate, and test a plugin in minutes, the
framework fails regardless of how elegant the Core is.

The existing codebase already contains a **Phase 13.4 CLI Toolkit** and an
**SDK** (`@awie/sdk`). This ADR does not start from zero — it evaluates how to
**harden and complete** those foundations with mature OSS, while preserving the
Core Constitution.

### The three DX capabilities under evaluation

1. **Plugin CLI** (`npx awie plugin create`) — scaffolding, building, and
   installing plugins. Evaluates Commander.js, Oclif, Enquirer.
2. **Plugin Linter / Validator** (`awie doctor`) — statically enforcing the
   Core Constitution ("No Runtime Mutation", "No OSS Leakage", "Zero Core
   Imports"). Evaluates custom ESLint plugins vs. AST parsers vs. the
   TypeScript Compiler API.
3. **Plugin Test Harness** — providing mock runtimes (`createMockTheme`,
   `createMockRuntime`) so developers test plugins without spinning up the
   whole CMS. Evaluates wrapping Vitest or Jest.

### The DX layer's constitutional duty

The DX layer MUST NOT weaken the Core. It is bound by the same constitution it
helps enforce:

- **ADR-007 (Buy Before Build):** the DX layer itself must prefer mature OSS
  over hand-rolled infrastructure, except where the tool is AWIE's core IP
  (the Constitution checks).
- **ADR-008 (Runtime Purity):** the DX layer never executes a plugin against
  the frozen Core. It performs **offline static analysis** only.
- **Zero Core Imports:** a plugin may import ONLY from `@awie/sdk`. The DX
  layer enforces this statically.
- **No Runtime Mutation:** a plugin must never mutate the immutable
  `ThemeConfig` or the Runtime. The DX layer detects this statically.

The DX layer is a **facilitator**: it makes compliance the path of least
resistance. A scaffolded plugin is compliant by construction; a violating
plugin fails `awie doctor` before it can be published.

---

## Capability 1: Plugin CLI (`npx awie plugin create`)

The CLI is the developer's first touchpoint. It must scaffold a compliant
plugin in under 5 minutes, with zero manual configuration. The existing
`src/cli/commands/create.ts` already produces a minimal skeleton; this ADR
evaluates the OSS that powers the interactive experience and command framework.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Cost | Exit Strategy | Decision |
| --- | --- | --- | --- | --- | --- |
| **Commander.js** | MIT | **High.** De-facto standard for Node CLIs; actively maintained by the community; tiny dependency. | **Free.** Zero licensing cost; negligible bundle weight. | **Trivial.** Commander is a thin argument-parsing layer. Swapping to Oclif or Yargs requires changing only the command definitions, never the command logic. | **WRAP** |
| **Oclif** | MIT | **High.** Salesforce-backed; full CLI framework (commands, hooks, plugins, autocomplete). | **Free.** Zero licensing cost; heavier dependency tree. | **Moderate.** Oclif's plugin/hook system is powerful but opinionated; migrating away requires re-architecting command loading. | **WRAP (optional)** |
| **Yargs** | MIT | **High.** Mature and widely used; actively maintained. | **Free.** Zero licensing cost; small footprint. | **Trivial.** Similar to Commander — a thin parsing layer with a clean swap path. | **WRAP (alternative)** |
| **Enquirer** | MIT | **High.** The standard for interactive prompts (autocomplete, multi-select, confirm); actively maintained. | **Free.** Zero licensing cost. | **Trivial.** Enquirer is a pure prompt layer; the collected answers feed the same scaffold logic regardless of prompt library. | **WRAP** |
| **Custom CLI framework** | — | **Low.** Hand-rolled argument parsing, help text, and prompts duplicate mature OSS. | **High.** Ongoing maintenance of generic infrastructure, not AWIE IP. | **N/A.** No exit strategy needed because there is nothing to exit — but the cost is unjustified. | **BUILD (rejected)** |

### How we WRAP them

Following ADR-007, the CLI framework is isolated behind an AWIE-owned command
registry (`src/cli/core/registry.ts` already exists). The Core Constitution
depends only on AWIE interfaces — never on Commander or Enquirer types.

- **Commander.js** powers the command tree and argument parsing.
- **Enquirer** powers the interactive prompts (`npx awie plugin create` asks
  for the plugin name, description, and capabilities).
- **The AWIE command registry** converts the parsed arguments into pure
  `CommandResult` declarations (the existing pattern in `create.ts`), keeping
  the command logic free of framework coupling.

This preserves **replaceability** (Amendment A) and **exit strategy**
(Amendment B): swapping Commander for Oclif, or Enquirer for a custom prompt
UI, requires changing only the thin adapter — never the command logic nor its
consumers.

---

## Capability 2: Plugin Linter / Validator (`awie doctor`)

The validator is the **guardian of the Core Constitution**. It must statically
enforce, offline, that a plugin:

1. Has a valid manifest.
2. Declares a compatible Core version (SemVer).
3. Imports ONLY from `@awie/sdk` (**Zero Core Imports**).
4. Never mutates the Runtime or the immutable `ThemeConfig`
   (**No Runtime Mutation**).
5. Never leaks OSS into the Core (**No OSS Leakage**).

The existing `src/cli/validator/zero-core-imports.ts` uses a **regex-based**
scanner. This ADR evaluates whether to keep that approach or upgrade to a
proper AST/TypeScript Compiler API.

### OSS Survey (WRAP / BUILD)

| OSS | License | Maintenance | Cost | Exit Strategy | Decision |
| --- | --- | --- | --- | --- | --- |
| **TypeScript Compiler API** | Apache-2.0 | **High.** Bundled with TypeScript itself; guaranteed to track the language; zero extra dependency. | **Free.** Zero licensing cost; already a dev dependency. | **Trivial.** The TS Compiler API is the canonical AST for TypeScript. Any future parser (e.g., Babel) can be swapped behind the same AWIE analysis interface. | **WRAP** |
| **@typescript-eslint (custom ESLint plugin)** | MIT | **High.** The standard for TS linting; actively maintained; rich rule ecosystem. | **Free.** Zero licensing cost; adds ESLint as a dev dependency. | **Moderate.** ESLint rules are powerful but tied to ESLint's rule lifecycle; migrating to a standalone analyzer requires re-expressing rules. | **WRAP (optional)** |
| **Babel Parser** | MIT | **High.** Mature, widely used, fast. | **Free.** Zero licensing cost. | **Trivial.** Babel produces a standard ESTree AST; swappable behind the same analysis interface. | **WRAP (alternative)** |
| **Regex-based scanner (current)** | — | **Low.** Fragile; cannot reliably detect imports inside comments, template literals, or dynamic `require`. Cannot analyze mutation or type-level violations. | **Low upfront, High long-term.** Cheap to write, expensive to maintain as false positives/negatives accumulate. | **N/A.** The current regex scanner is a stopgap, not a foundation. | **BUILD (rejected as primary)** |
| **Custom AST parser** | — | **Low.** Hand-rolling a TypeScript parser duplicates the TS Compiler API. | **High.** Massive ongoing maintenance of generic infrastructure. | **N/A.** Unjustified cost. | **BUILD (rejected)** |

### The decision: TypeScript Compiler API as the primary analyzer

The **TypeScript Compiler API** is the recommended primary analyzer because:

- It is **already a dev dependency** (zero new cost).
- It produces the **canonical, complete AST** for TypeScript — no regex
  fragility.
- It enables **type-aware analysis**: detecting "No Runtime Mutation" by
  checking whether a plugin calls a mutating method on a `ThemeConfig`-typed
  value, and "No OSS Leakage" by resolving import specifiers to their packages.

The **@typescript-eslint custom ESLint plugin** is a **WRAP (optional)** for
developer-facing linting in the editor (inline squiggles), while the TS
Compiler API powers the authoritative `awie doctor` gate. Both share the same
AWIE-owned rule definitions, so a rule written once is enforced in both the
editor and the CLI.

### The Constitution checks (BUILD — AWIE core IP)

The following checks are AWIE's core IP and MUST remain custom (Level 3 BUILD):

- **Zero Core Imports** — resolve every import specifier and assert it is
  `@awie/sdk` or a standard/third-party package, never an internal Core module.
- **No Runtime Mutation** — detect calls that would mutate the immutable
  `ThemeConfig` or the Runtime state (e.g., assigning to a `readonly` field,
  calling a mutator on a Runtime-owned object).
- **No OSS Leakage** — assert that a plugin's declared dependencies do not
  include libraries that belong behind AWIE adapters (e.g., a plugin must not
  import CASL or NextAuth directly; it must use the AWIE snapshot contract).

These checks are expressed once as AWIE-owned rules and consumed by both the
TS Compiler API analyzer (CLI) and the ESLint plugin (editor).

---

## Capability 3: Plugin Test Harness

The test harness must let a developer test a plugin **without spinning up the
whole CMS**. It provides mock runtimes — `createMockTheme`, `createMockRuntime`
— that implement the narrow `@awie/sdk` contracts with deterministic fixtures.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Cost | Exit Strategy | Decision |
| --- | --- | --- | --- | --- | --- |
| **Vitest** | MIT | **High.** Modern, fast (Vite-powered), native ESM/TS, zero-config for this stack; actively maintained. | **Free.** Zero licensing cost; already aligned with the Vite/Next toolchain. | **Trivial.** Vitest is Jest-compatible in API; tests written against the AWIE harness run under Jest with minimal changes. | **WRAP** |
| **Jest** | MIT | **High.** The long-standing standard; huge ecosystem; actively maintained. | **Free.** Zero licensing cost; heavier config for ESM/TS. | **Trivial.** Jest is the compatibility baseline; the AWIE harness is framework-agnostic. | **WRAP (alternative)** |
| **Custom test runner** | — | **Low.** Hand-rolling assertion, mocking, and watch mode duplicates mature OSS. | **High.** Ongoing maintenance of generic infrastructure. | **N/A.** Unjustified cost. | **BUILD (rejected)** |

### How we WRAP them

The AWIE Test Harness is a thin layer over Vitest (default) / Jest
(alternative):

- **`createMockTheme()`** returns a frozen, deterministic `ThemeConfig`
  fixture that satisfies the `@awie/sdk` theme contract.
- **`createMockRuntime()`** returns a mock runtime exposing the narrow
  execution-contract ports a plugin may consume, with recorded calls for
  assertions.
- **The harness** is framework-agnostic: it exposes plain functions that return
  plain fixtures. Vitest/Jest provide the runner, assertions, and watch mode.

This preserves **replaceability** (Amendment A) and **exit strategy**
(Amendment B): a developer can run the same AWIE harness under Vitest or Jest
without rewriting their plugin tests.

---

## Comparison Table (Summary)

| Capability | OSS / Strategy | License | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| **Plugin CLI** | Commander.js + Enquirer | MIT | **WRAP** | Command tree and prompts isolated behind the AWIE command registry. | **Low** |
| **Plugin CLI** (alt) | Oclif | MIT | **WRAP (optional)** | Full CLI framework; heavier but feature-rich. | **Medium** |
| **Plugin Linter** | TypeScript Compiler API | Apache-2.0 | **WRAP** | Canonical AST powers `awie doctor`; type-aware Constitution checks. | **Low** |
| **Plugin Linter** (alt) | @typescript-eslint custom plugin | MIT | **WRAP (optional)** | Editor inline linting; shares AWIE rule definitions. | **Low** |
| **Plugin Linter** (alt) | Regex scanner (current) | — | **BUILD (rejected)** | Fragile; cannot analyze mutation or type-level violations. | **High** |
| **Test Harness** | Vitest | MIT | **WRAP** | AWIE harness over Vitest; mock theme/runtime fixtures. | **Low** |
| **Test Harness** (alt) | Jest | MIT | **WRAP (alternative)** | Jest-compatible; same AWIE harness. | **Low** |
| **Constitution Checks** | AWIE rules (Zero Core Imports, No Runtime Mutation, No OSS Leakage) | — | **BUILD** | AWIE core IP; expressed once, consumed by CLI + editor. | **Low** |

---

## Decision

**Adopt a WRAP strategy for all generic infrastructure, and a minimal BUILD for
the Constitution checks.**

- **Plugin CLI → Commander.js + Enquirer (WRAP).** Commander powers the command
  tree; Enquirer powers interactive prompts. Both are isolated behind the AWIE
  command registry.
- **Plugin Linter → TypeScript Compiler API (WRAP).** The canonical AST powers
  `awie doctor`. @typescript-eslint is an optional WRAP for editor inline
  linting, sharing the same AWIE rule definitions.
- **Test Harness → Vitest (WRAP).** The AWIE harness (`createMockTheme`,
  `createMockRuntime`) runs over Vitest by default, Jest as an alternative.
- **Constitution Checks → AWIE rules (BUILD).** Zero Core Imports, No Runtime
  Mutation, and No OSS Leakage are AWIE's core IP. They are expressed once and
  enforced in both the CLI and the editor.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The Constitution Checks** — Zero Core Imports, No Runtime Mutation, No OSS
  Leakage. These encode the frozen Core Constitution and are AWIE's
  differentiating IP.
- **The AWIE Test Harness** — `createMockTheme`, `createMockRuntime`, and the
  deterministic fixtures that implement the `@awie/sdk` contracts.
- **The AWIE command registry** — the pure `CommandResult` contract that keeps
  command logic free of framework coupling.

---

## Decision Record: API Naming Freeze (AR-1)

The Architecture Review Board has **APPROVED** this ADR and **FROZEN** the
following public API names. These names are now part of the Developer Platform
contract and MUST NOT be renamed without a new ADR.

### Frozen Test Harness API (`@awie/sdk`)

| Frozen name | Contract | Purpose |
| --- | --- | --- |
| `createThemeFixture` | `(overrides?) => ThemeConfig` | Returns a frozen, deterministic `ThemeConfig` fixture satisfying the `@awie/sdk` theme contract. |
| `createRuntimeStub` | `(overrides?) => RuntimeStub` | Returns a mock runtime exposing the narrow execution-contract ports a plugin may consume, with recorded calls for assertions. |
| `PluginCapability` | `'renderer' \| 'theme' \| 'component' \| 'data-adapter'` | The set of capabilities a plugin may declare. |

> **Note:** The earlier research names `createMockTheme` / `createMockRuntime`
> were **superseded** by `createThemeFixture` / `createRuntimeStub` during the
> AR-1 review. The frozen names are the fixture/stub pair above.

### Frozen Validator UX Pattern (Rule Registry Pattern)

The validator is **COMPLETELY DECOUPLED** from its rules. Rules are registered
as **PLUGINS** to the checker via a `RuleRegistry`. New rules can be added
without modifying the runner.

| Frozen name | Contract | Purpose |
| --- | --- | --- |
| `IValidationRule` | `{ id, description, evaluate(ast): ValidationVerdict }` | The rule contract. A rule is a pure function over a `ValidationAst`. |
| `ValidationVerdict` | `{ ruleId, severity, message, file? }` | The outcome of a single rule evaluation. |
| `RuleRegistry` | `register(rule)`, `check(ast, strict?): RuleCheckResult` | The checker. Runs all registered rules and aggregates verdicts. |
| `createDefaultRuleRegistry()` | `() => RuleRegistry` | Builds a registry pre-registered with the built-in rules. |
| `ZeroCoreImportsRule` | `IValidationRule` | Asserts a plugin imports ONLY from `@awie/sdk` (ADR-008). |
| `NoRuntimeMutationRule` | `IValidationRule` | Asserts a plugin does NOT mutate the Runtime or the immutable `ThemeConfig` (ADR-008). |

### Frozen CLI command surface

| Command | Usage | Purpose |
| --- | --- | --- |
| `awie new plugin <name>` | `[--renderer] [--theme] [--component] [--data-adapter] [--core-version]` | **Generator over Templates.** Scaffolds a plugin from a capability-driven prompt. |
| `awie check <file...>` | `[--strict]` | Runs the **Rule Registry Pattern** against plugin source files (offline static analysis). |

The `new` command is a **Generator over Templates**: it scaffolds a compliant
plugin by construction from a capability selection. The `check` command is the
**Rule Registry Pattern**: the runner is decoupled from the rules, which are
registered as plugins.

---

## Consequences


**Positive:**
- **Compliance by construction.** A scaffolded plugin is compliant by default;
  a violating plugin fails `awie doctor` before publication. The Constitution
  becomes effortless to obey.
- **Lower maintenance.** We stop maintaining hand-rolled argument parsing,
  prompts, AST parsing, and test runners. Commander, Enquirer, the TS Compiler
  API, and Vitest are community-maintained and battle-tested.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP (the
  Constitution checks and the test harness), aligning with Article VII.
- **Replaceability.** Swapping Commander for Oclif, or Vitest for Jest, requires
  changing only the AWIE adapter — never the Core Constitution nor its
  consumers.
- **Editor + CLI parity.** A Constitution rule written once is enforced both in
  the editor (ESLint squiggles) and the CLI (`awie doctor`).

**Negative:**
- **New dependencies.** Adds Commander, Enquirer, and Vitest to the DX
  dependency tree (all are small, MIT-licensed, and tree-shakeable).
- **Adapter indirection.** A thin AWIE adapter layer is required to isolate the
  OSS from the Core Constitution. This indirection must be documented and
  tested.
- **TS Compiler API complexity.** Type-aware analysis is more powerful but more
  complex than the current regex scanner. The migration must be incremental and
  well-tested.

**Trade-off:** We accept a small DX dependency footprint and an adapter layer in
exchange for dramatically lower maintenance cost, battle-tested tooling, and —
most importantly — a Constitution that is enforced by construction rather than
by developer discipline.

---

## Alternatives Considered

1. **Custom CLI framework (Level 3 BUILD).** Rejected: violates Article VII.
   Hand-rolled argument parsing, prompts, and help text duplicate Commander,
   Oclif, and Enquirer.
2. **Regex-based scanner as the primary validator.** Rejected: fragile and
   cannot detect mutation or type-level violations. It remains a stopgap, not a
   foundation.
3. **Custom AST parser.** Rejected: duplicates the TypeScript Compiler API at
   massive maintenance cost.
4. **Jest as the primary test runner.** Deferred: Vitest is the natural fit for
   this Vite/Next stack. Jest remains a compatible alternative behind the same
   AWIE harness.
5. **Oclif as the primary CLI framework.** Deferred: powerful but heavier than
   needed. Commander is the default; Oclif remains an optional alternative.

---

## Compliance

This ADR is **Approved (AR-1)**. The API Naming Freeze is in effect. The
following invariants MUST remain enforced:


- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Runtime Purity constitution (ADR-008)** — the DX layer never executes a
  plugin against the frozen Core; it performs offline static analysis only.
- The **Buy Before Build constitution (ADR-007)** — generic infrastructure is
  delegated to OSS; only the Constitution checks and the test harness remain
  custom.
- The **Zero Core Imports rule** — a plugin may import ONLY from `@awie/sdk`;
  the DX layer enforces this statically.
- The **No Runtime Mutation rule** — a plugin must never mutate the immutable
  `ThemeConfig` or the Runtime; the DX layer detects this statically.
- The **No OSS Leakage rule** — a plugin must not import libraries that belong
  behind AWIE adapters; the DX layer detects this statically.
