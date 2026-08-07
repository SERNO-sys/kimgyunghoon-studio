/**
 * AWIE V2 - Phase 16.1: Application Runtime Foundation - Hydration Engine.
 *
 * An engine that takes a static ThemeConfig (as a read-only reference) and
 * the current RuntimeState from the StateStore, outputting a combined
 * representation or hydration instructions WITHOUT mutating the original
 * ThemeConfig.
 *
 * ============================================================================
 * THE OVERLAY PATTERN
 * ============================================================================
 * The ThemeConfig is STRICTLY IMMUTABLE. The Runtime MUST NEVER mutate the
 * ThemeConfig. Instead, the Runtime maintains a mutable RuntimeState. The UI
 * is the result of ThemeConfig (Immutable) + RuntimeState (Mutable Overlay).
 *
 * This engine NEVER mutates the ThemeConfig. It reads the static ThemeConfig
 * (read-only) and the mutable RuntimeState, and produces a NEW HydrationResult
 * containing HydrationInstructions. The original ThemeConfig object is left
 * strictly unmodified.
 *
 * FRAMEWORK AGNOSTIC:
 * This engine does NOT depend on React, Vue, or any specific UI framework. It
 * merely orchestrates state and emits HydrationInstructions or state
 * snapshots. The framework-specific layer consumes the instructions.
 *
 * SEPARATION OF CONCERNS:
 * The Runtime orchestrates interactions (ActionRegistry, PermissionResolver,
 * LiveDataAdapter) but never owns presentation. This engine patches DATA
 * (e.g., a live price) onto static components; it NEVER touches presentation
 * (e.g., buttonColor).
 * ============================================================================
 */

import type {
  HydrationInstruction,
  HydrationResult,
  IActionRegistry,
  ILiveDataAdapter,
  IPermissionResolver,
  IRuntimeContext,
  PermissionInstruction,
  PermissionVerdict,
  RuntimeState,
} from './types';


/**
 * The options for the Hydration Engine.
 *
 * The engine is framework-agnostic. It orchestrates state and emits
 * HydrationInstructions. It does NOT own presentation.
 */
export interface HydrationEngineOptions {
  /**
   * The registry of actions available to the Runtime.
   */
  readonly actionRegistry: IActionRegistry;

  /**
   * Resolves whether a given action is permitted for the current context.
   */
  readonly permissionResolver: IPermissionResolver;

  /**
   * Fetches live data for a given target.
   */
  readonly liveDataAdapter: ILiveDataAdapter;
}

/**
 * The Hydration Engine.
 *
 * It takes a static ThemeConfig (read-only) and the current RuntimeState, and
 * outputs a combined representation (HydrationResult) WITHOUT mutating the
 * original ThemeConfig.
 */
export class HydrationEngine {
  private readonly actionRegistry: IActionRegistry;
  private readonly permissionResolver: IPermissionResolver;
  private readonly liveDataAdapter: ILiveDataAdapter;

  constructor(options: HydrationEngineOptions) {
    this.actionRegistry = options.actionRegistry;
    this.permissionResolver = options.permissionResolver;
    this.liveDataAdapter = options.liveDataAdapter;
  }

  /**
   * Hydrates the static ThemeConfig with the current RuntimeState.
   *
   * This produces a NEW HydrationResult. The original ThemeConfig is NEVER
   * mutated.
   *
   * @param themeConfig The static, immutable ThemeConfig (read-only).
   * @param state The current mutable RuntimeState overlay.
   * @returns A Promise resolving to a HydrationResult containing hydration
   *          instructions and a state snapshot.
   */
  async hydrate(themeConfig: Readonly<unknown>, state: RuntimeState): Promise<HydrationResult> {
    const context: IRuntimeContext = {
      state,
      themeConfig,
    };

    const instructions: HydrationInstruction[] = [];

    // For each live data patch in the RuntimeState overlay, emit a hydration
    // instruction that tells the framework layer WHICH static component to
    // render and WHAT live data to overlay onto it.
    for (const patch of state.liveData) {
      const fetched = await this.liveDataAdapter.fetch(patch.targetId);
      const liveData = fetched ? fetched.value : patch.value;

      // Resolve the permitted actions for this component. The Runtime
      // orchestrates permissions; it does NOT own presentation.
      const permittedActions = this.actionRegistry
        .list()
        .filter((actionId) => this.permissionResolver.can(context, actionId));

      instructions.push({
        targetId: patch.targetId,
        liveData,
        permittedActions,
      });
    }

    // ==========================================================================
    // ADR-009 (Permission Snapshot) — PERMISSION SNAPSHOT RULE
    // ==========================================================================
    // The Runtime NEVER evaluates authorization rules. It only consumes the
    // immutable PermissionSnapshot carried in the RuntimeState overlay.
    //
    // The engine performs a PURE dictionary join: targetId -> ThemeConfig ->
    // HydrationInstruction. It translates each raw PermissionVerdict into a
    // rich UI instruction (Level B: Verdict vs. Instruction Separation) WITHOUT
    // evaluating any rule. The engine does NOT know WHY a user has access; it
    // only blindly trusts the snapshot.
    //
    // ZERO ENGINE RULE: No PermissionService, PolicyEngine,
    // AuthorizationResolver, or SessionManager is built here. The engine only
    // maps verdicts to instructions.
    // ==========================================================================
    const snapshot = state.permissionSnapshot;
    if (snapshot) {
      for (const verdict of snapshot.verdicts) {
        instructions.push({
          targetId: verdict.targetId,
          permission: this.translateVerdict(verdict),
        });
      }
    }

    return {
      instructions,
      stateSnapshot: state,
    };
  }

  /**
   * Translates a raw PermissionVerdict into a rich UI instruction.
   *
   * ============================================================================
   * ADR-009 (Permission Snapshot) — LEVEL B: VERDICT vs. INSTRUCTION SEPARATION
   * ============================================================================
   * The PermissionSnapshot contains only MINIMAL verdicts (visibility,
   * enabled). This method owns the responsibility of translating those raw
   * verdicts into RICH UI instructions (e.g., Hide, Mask, Blur, Skeleton,
   * Redact).
   *
   * This is a PURE translation. It performs NO authorization logic — it does
   * not inspect the user, the session, or any policy. It only maps the raw
   * verdict fields to a UI instruction. The engine blindly trusts the snapshot
   * (Zero Engine Rule).
   *
   * @param verdict The raw permission verdict from the snapshot.
   * @returns The rich UI instruction for the framework layer.
   */
  private translateVerdict(verdict: PermissionVerdict): PermissionInstruction {
    // A hidden target is fully removed from the UI.
    if (verdict.visibility === 'hide') {
      return 'hide';
    }

    // A visible but disabled target is rendered as a skeleton (placeholder)
    // that cannot be interacted with.
    if (!verdict.enabled) {
      return 'skeleton';
    }

    // A visible and enabled target requires no special UI treatment.
    return 'show';
  }
}


