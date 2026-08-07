/**
 * AWIE V2 - Phase 16.1: Application Runtime Foundation - Core Types.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES: THE OVERLAY PATTERN & FRAMEWORK AGNOSTICISM
 * ============================================================================
 * The Architecture Review Board has declared Architecture Freeze v2 on the
 * CMS Core. We now begin building the Application Runtime (located in
 * src/runtime/core).
 *
 * 1. THE OVERLAY PATTERN:
 *    - The ThemeConfig is STRICTLY IMMUTABLE.
 *    - The Runtime MUST NEVER mutate the ThemeConfig.
 *    - Instead, the Runtime maintains a mutable RuntimeState.
 *    - The UI is the result of ThemeConfig (Immutable) + RuntimeState
 *      (Mutable Overlay).
 *
 * 2. FRAMEWORK AGNOSTIC:
 *    - This Runtime Core MUST NOT depend on React, Vue, or any specific UI
 *      framework.
 *    - It merely orchestrates state and emits HydrationInstructions or state
 *      snapshots.
 *
 * 3. SEPARATION OF CONCERNS:
 *    - The Runtime orchestrates interactions (ActionRegistry,
 *      PermissionResolver, LiveDataAdapter) but never owns presentation
 *      (e.g., it patches data like price: $100, but doesn't touch
 *      buttonColor).
 * ============================================================================
 */

/**
 * A single live data patch that the Runtime overlays onto a static component.
 *
 * This is a MUTABLE, LIVE value. It is part of the RuntimeState overlay, NOT
 * part of the immutable ThemeConfig. The Runtime patches DATA (e.g., a live
 * price), but NEVER presentation (e.g., buttonColor).
 */
export interface LiveDataPatch {
  /**
   * The stable id of the component/slot this patch targets.
   */
  readonly targetId: string;

  /**
   * The live data value to overlay (e.g., { price: 100 }).
   */
  readonly value: unknown;
}

/**
 * A single permission verdict for a UI target.
 *
 * ============================================================================
 * ADR-009 (Permission Snapshot) — Amendment B: SEMANTIC TARGET ID
 * ============================================================================
 * The `targetId` MUST be a Semantic Component Identity (e.g., 'hero.login',
 * 'pricing.button'). It is strictly decoupled from DOM IDs, Framework IDs, or
 * UUIDs. This is a core contract.
 *
 * A verdict is a RESULT, not a rule. It does NOT say WHY the user has access;
 * it only states WHAT the Runtime may do with the target. The Runtime NEVER
 * evaluates authorization rules (ADR-009 Permission Snapshot Rule).
 */
export interface PermissionVerdict {
  /**
   * The Semantic Component Identity of the target (e.g., 'hero.login',
   * 'pricing.button'). Strictly decoupled from DOM IDs, Framework IDs, or
   * UUIDs (Amendment B).
   */
  readonly targetId: string;

  /**
   * The resolved visibility for this target.
   */
  readonly visibility: 'show' | 'hide';

  /**
   * The resolved interactivity for this target.
   */
  readonly enabled: boolean;
}

/**
 * The immutable permission snapshot produced by the Application layer.
 *
 * ============================================================================
 * ADR-009 (Permission Snapshot) — Amendment A: SNAPSHOT VERSIONING
 * ============================================================================
 * The snapshot MUST include `version` and `issuedAt` to trace and debug cache
 * inconsistencies between the Edge and the Runtime.
 *
 * The Runtime consumes this snapshot and maps it to UI components defined in
 * ThemeConfig WITHOUT evaluating any rule. The snapshot is a pure data
 * carrier — it carries verdicts, never policy.
 */
export interface PermissionSnapshot {
  /**
   * The version of the snapshot contract (for forward compatibility and to
   * trace cache inconsistencies between the Edge and the Runtime).
   */
  readonly version: string;

  /**
   * The ISO timestamp when the snapshot was issued (for cache debugging).
   */
  readonly issuedAt: string;

  /**
   * The verdicts for each UI target.
   */
  readonly verdicts: readonly PermissionVerdict[];
}


/**
 * A named feature slice of the RuntimeState.
 *
 * Feature slices isolate domain state so that updates in one domain (e.g.,
 * commerce) do NOT overwrite state in another domain (e.g., reservation). Each
 * slice is a plain mutable data object owned by the Runtime overlay.
 */
export type FeatureSlice = Record<string, unknown>;

/**
 * The set of feature slices held by the RuntimeState.
 *
 * Each key is a domain name (e.g., 'commerce', 'reservation', 'crm',
 * 'analytics'). The Runtime patches a slice via the StateStore's patchSlice
 * method, which merges into ONLY that slice, leaving all other slices intact.
 */
export interface FeatureSlices {
  /**
   * Commerce state (e.g., cart, product prices, inventory).
   */
  readonly commerce?: FeatureSlice;

  /**
   * Reservation state (e.g., bookings, availability).
   */
  readonly reservation?: FeatureSlice;

  /**
   * CRM state (e.g., leads, contacts, customer segments).
   */
  readonly crm?: FeatureSlice;

  /**
   * Analytics state (e.g., page views, events, metrics).
   */
  readonly analytics?: FeatureSlice;
}

/**
 * The mutable state overlay maintained by the Runtime.
 *
 * The UI is the result of ThemeConfig (Immutable) + RuntimeState (Mutable
 * Overlay). This structure holds ONLY live, user-specific, transactional,
 * observational, or mutable state. It NEVER holds presentation contracts.
 */
export interface RuntimeState {
  /**
   * The live data patches to overlay onto static components.
   */
  readonly liveData: readonly LiveDataPatch[];

  /**
   * The feature slices (domain-scoped mutable state).
   *
   * Updates in one slice MUST NOT overwrite other slices.
   */
  readonly slices: FeatureSlices;

  /**
   * The current user identity (if any). This is Application-level state, NOT
   * part of the ThemeConfig.
   */
  readonly userId?: string;

  /**
   * The current locale (if any). This is Application-level state, NOT part of
   * the ThemeConfig.
   */
  readonly locale?: string;

  /**
   * The immutable permission snapshot produced by the Application layer (if
   * any).
   *
   * ============================================================================
   * ADR-009 (Permission Snapshot) — PERMISSION SNAPSHOT RULE
   * ============================================================================
   * The Runtime NEVER evaluates authorization rules. It only consumes this
   * immutable permission snapshot. The Runtime does NOT know WHY a user has
   * access; it only reads the snapshot and generates Hydration Instructions
   * (e.g., Hide Component A, Disable Button B).
   *
   * The snapshot is part of the RuntimeState overlay, NOT part of the
   * immutable ThemeConfig.
   */
  readonly permissionSnapshot?: PermissionSnapshot;
}


/**
 * The context passed to every Runtime interaction.
 *
 * This is a passive data carrier. It carries the current RuntimeState and the
 * immutable ThemeConfig reference. It does NOT carry presentation logic.
 */
export interface IRuntimeContext {
  /**
   * The current mutable state overlay.
   */
  readonly state: RuntimeState;

  /**
   * A read-only reference to the immutable ThemeConfig.
   *
   * The Runtime MUST NEVER mutate this. It is provided for read-only access
   * only.
   */
  readonly themeConfig: Readonly<unknown>;
}

/**
 * A single action that the Runtime may execute.
 *
 * Actions orchestrate interactions. They receive the RuntimeContext and may
 * return a new RuntimeState (or a partial patch to it). They NEVER touch
 * presentation.
 */
export interface IAction {
  /**
   * The stable id of the action (e.g., 'add-to-cart').
   */
  readonly id: string;

  /**
   * Executes the action against the given context.
   *
   * @param context The current runtime context.
   * @param payload The action payload (e.g., { productId, quantity }).
   * @returns A partial RuntimeState patch, or undefined if no state change.
   */
  execute(
    context: IRuntimeContext,
    payload: unknown,
  ): Partial<RuntimeState> | undefined | Promise<Partial<RuntimeState> | undefined>;
}

/**
 * The registry of actions available to the Runtime.
 *
 * The Runtime orchestrates interactions through this registry. It does NOT
 * own presentation.
 */
export interface IActionRegistry {
  /**
   * Registers an action.
   */
  register(action: IAction): void;

  /**
   * Resolves an action by id.
   */
  get(id: string): IAction | undefined;

  /**
   * Lists all registered action ids.
   */
  list(): readonly string[];
}

/**
 * Resolves whether a given action is permitted for the current context.
 *
 * The Runtime orchestrates permissions. It does NOT own presentation.
 */
export interface IPermissionResolver {
  /**
   * Determines whether the given action is permitted.
   *
   * @param context The current runtime context.
   * @param actionId The action id to check.
   * @returns true if permitted, false otherwise.
   */
  can(context: IRuntimeContext, actionId: string): boolean;
}

/**
 * Fetches live data for a given target.
 *
 * The Runtime orchestrates live data. It does NOT own presentation.
 */
export interface ILiveDataAdapter {
  /**
   * Fetches the live data patch for the given target.
   *
   * @param targetId The stable id of the component/slot.
   * @returns A LiveDataPatch, or undefined if no live data is available.
   */
  fetch(targetId: string): LiveDataPatch | undefined | Promise<LiveDataPatch | undefined>;
}

/**
 * A domain-scoped live data adapter.
 *
 * Each domain (commerce, reservation, crm, analytics) provides an adapter that
 * fetches live data for its own feature slice. The adapter declares which
 * slice it owns so the AdapterRegistry can route fetched data into the correct
 * slice of the RuntimeState.
 *
 * The Runtime orchestrates live data. It does NOT own presentation.
 */
export interface IDomainLiveDataAdapter extends ILiveDataAdapter {
  /**
   * The name of the feature slice this adapter owns (e.g., 'commerce').
   */
  readonly sliceName: keyof FeatureSlices;

  /**
   * Fetches the full live data payload for this domain's slice.
   *
   * @param context The current runtime context.
   * @returns The live data to merge into this domain's feature slice, or
   *          undefined if no live data is available.
   */
  fetchSlice(
    context: IRuntimeContext,
  ): FeatureSlice | undefined | Promise<FeatureSlice | undefined>;
}

/**
 * The registry of domain live data adapters.
 *
 * The Runtime orchestrates live data through this registry. It does NOT own
 * presentation. The registry routes each adapter's fetched data into the
 * correct feature slice of the RuntimeState.
 */
export interface IAdapterRegistry {
  /**
   * Registers a domain live data adapter.
   */
  register(adapter: IDomainLiveDataAdapter): void;

  /**
   * Resolves an adapter by slice name.
   */
  get(sliceName: keyof FeatureSlices): IDomainLiveDataAdapter | undefined;

  /**
   * Lists all registered slice names.
   */
  list(): readonly (keyof FeatureSlices)[];
}

/**
 * A subscriber callback invoked whenever the RuntimeState changes.
 */
export type StateSubscriber = (state: RuntimeState) => void;

/**
 * A single Client Action handler.
 *
 * ============================================================================
 * ADR-008 (Client Actions) — Amendment D: HANDLER ISOLATION
 * ============================================================================
 * An ActionHandler consumes a RUNTIME PAYLOAD ONLY (e.g., { productId,
 * quantity }). The immutable ThemeConfig object MUST NEVER be passed into an
 * execution handler. Handlers MUST NOT mutate the ThemeConfig; they operate on
 * the mutable RuntimeState overlay (via the StateStore) or perform side
 * effects (e.g., a TanStack Mutation).
 *
 * The handler is execution-only. It never resolves, edits, composes,
 * validates, or decides presentation (ADR-008 Runtime Purity).
 *
 * @param payload The runtime payload for this action (never the ThemeConfig).
 * @returns A promise or void. The handler may perform side effects.
 */
export type ActionHandler = (payload: unknown) => Promise<void> | void;

/**
 * The strictly thin Client Action router.
 *
 * ============================================================================
 * ADR-008 (Client Actions) — THIN ROUTER PATTERN
 * ============================================================================
 * Do NOT build a Dispatcher, Bus, or Queue. This interface merely resolves a
 * stable action id string to a handler function. It is a pure dictionary
 * lookup — it MUST NOT execute handlers, manage async state, apply retries, or
 * perform validation. Those concerns belong to the WRAP layer (TanStack Query
 * Mutations, React Hook Form + Zod).
 *
 * Amendment C (Stable Action Contract): Action ids (e.g., 'cart.add',
 * 'reservation.submit') are immutable public contracts. They MUST NOT encode
 * framework details, HTTP verbs, or infrastructure names.
 */
export interface IActionRouter {
  /**
   * Resolves a stable action id to its handler.
   *
   * @param actionId The stable action id (e.g., 'cart.add').
   * @returns The handler, or undefined if the action id is not registered.
   */
  resolve(actionId: string): ActionHandler | undefined;
}


/**
 * The framework-agnostic observable store contract holding the RuntimeState.
 *
 * ============================================================================
 * ADR-007 (Buy Before Build) — THE THIN ADAPTER PATTERN
 * ============================================================================
 * This is the REUSABLE INTERFACE that the Core Constitution depends on. It is
 * deliberately free of any OSS library types (zustand, @tanstack/react-query,
 * etc.). Concrete implementations (e.g., ZustandStateStore) wrap a mature OSS
 * library behind this interface so that the OSS library NEVER leaks into the
 * Core Constitution or the HydrationEngine.
 *
 * Replaceability (Amendment A): The OSS library is isolated behind AWIE-owned
 * adapters. Swapping the backing library requires changing ONLY the concrete
 * implementation, never this interface nor its consumers.
 *
 * Exit Strategy (Amendment B): Because consumers depend only on this interface,
 * the backing library can be replaced within one week without changing any
 * core contract.
 *
 * The store holds ONLY the mutable RuntimeState overlay. It has NO reference
 * to, and NEVER touches, the immutable ThemeConfig.
 * ============================================================================
 */
export interface IStateStore {
  /**
   * Returns the current RuntimeState snapshot.
   *
   * This is a snapshot-based read. The returned object is the current state;
   * callers MUST NOT mutate it directly. Use setState to update.
   */
  getState(): RuntimeState;

  /**
   * Applies a partial patch to the RuntimeState, producing a NEW state object.
   *
   * This is an immutable update. The previous state object is never mutated.
   * Subscribers are notified with the new state.
   *
   * @param patch A partial RuntimeState to merge into the current state.
   */
  setState(patch: Partial<RuntimeState>): void;

  /**
   * Patches a SINGLE feature slice, producing a NEW state object.
   *
   * This is an immutable, slice-scoped update. Only the named slice is merged;
   * all other slices (and the rest of the state) are preserved. This prevents
   * updates in one domain (e.g., commerce) from overwriting another domain
   * (e.g., reservation).
   *
   * @param sliceName The name of the feature slice to patch.
   * @param patch The partial slice data to merge into the named slice.
   */
  patchSlice<K extends keyof FeatureSlices>(
    sliceName: K,
    patch: FeatureSlice,
  ): void;

  /**
   * Subscribes to state changes.
   *
   * @param listener The subscriber callback.
   * @returns An unsubscribe function.
   */
  subscribe(listener: StateSubscriber): () => void;
}


/**
 * A rich UI instruction translated from a raw PermissionVerdict.
 *
 * ============================================================================
 * ADR-009 (Permission Snapshot) — LEVEL B: VERDICT vs. INSTRUCTION SEPARATION
 * ============================================================================
 * The PermissionSnapshot contains only MINIMAL verdicts (visibility, enabled).
 * The HydrationEngine owns the responsibility of translating these raw
 * verdicts into RICH UI instructions (e.g., Hide, Mask, Blur, Skeleton,
 * Redact).
 *
 * The engine performs a PURE dictionary join: targetId -> ThemeConfig ->
 * HydrationInstruction. It NEVER evaluates authorization rules (Zero Engine
 * Rule).
 */
export type PermissionInstruction =
  | 'show'
  | 'hide'
  | 'mask'
  | 'blur'
  | 'skeleton'
  | 'redact';


/**
 * A single hydration instruction emitted by the Hydration Engine.
 *
 * This is what the framework-specific layer will eventually consume. It tells
 * the framework layer WHICH static component to render and WHAT live data to
 * overlay onto it. It does NOT contain presentation logic.
 */
export interface HydrationInstruction {
  /**
   * The stable id of the component/slot to render.
   */
  readonly targetId: string;

  /**
   * The live data to overlay onto the static component (if any).
   */
  readonly liveData?: unknown;

  /**
   * The action ids permitted for this component (if any).
   */
  readonly permittedActions?: readonly string[];

  /**
   * The rich UI instruction translated from the raw PermissionVerdict (if any).
   *
   * ============================================================================
   * ADR-009 (Permission Snapshot) — LEVEL B: VERDICT vs. INSTRUCTION SEPARATION
   * ============================================================================
   * The engine translates a raw verdict (visibility: 'hide', enabled: false)
   * into a rich UI instruction (e.g., 'hide', 'mask', 'blur', 'skeleton',
   * 'redact'). This is a pure translation — the engine NEVER evaluates
   * authorization rules (Zero Engine Rule).
   */
  readonly permission?: PermissionInstruction;
}


/**
 * The combined representation output by the Hydration Engine.
 *
 * This is the result of ThemeConfig (Immutable) + RuntimeState (Mutable
 * Overlay). It is a NEW structure; it NEVER mutates the original ThemeConfig.
 */
export interface HydrationResult {
  /**
   * The hydration instructions for the framework-specific layer.
   */
  readonly instructions: readonly HydrationInstruction[];

  /**
   * A snapshot of the current RuntimeState.
   */
  readonly stateSnapshot: RuntimeState;
}
