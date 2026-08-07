/**
 * AWIE V2 - ADR-008 (Client Actions): MapActionRouter.
 *
 * ============================================================================
 * THIN ROUTER PATTERN (ADR-008)
 * ============================================================================
 * This is the ONLY custom piece (BUILD) in the Client Actions capability. It
 * is a strictly thin dictionary lookup that resolves a stable action id string
 * to a handler function.
 *
 * It MUST NOT:
 *   - execute handlers,
 *   - manage async state,
 *   - apply retries, or
 *   - perform validation.
 *
 * Those concerns belong to the WRAP layer (TanStack Query Mutations, React
 * Hook Form + Zod). This router is a pure `Map<string, ActionHandler>`.
 *
 * Amendment C (Stable Action Contract): Action ids (e.g., 'cart.add',
 * 'reservation.submit') are immutable public contracts. They MUST NOT encode
 * framework details, HTTP verbs, or infrastructure names.
 *
 * Amendment D (Handler Isolation): Handlers consume runtime payloads ONLY.
 * The immutable ThemeConfig object MUST NEVER be passed into a handler.
 * ============================================================================
 */

import type { ActionHandler, IActionRouter } from './types';

/**
 * A thin, dictionary-based implementation of {@link IActionRouter}.
 *
 * It holds a `Map<string, ActionHandler>` and resolves an action id to its
 * handler via a single lookup. It performs NO execution logic.
 */
export class MapActionRouter implements IActionRouter {
  private readonly handlers = new Map<string, ActionHandler>();

  /**
   * Registers a stable action id to a handler.
   *
   * @param actionId The stable action id (e.g., 'cart.add'). MUST NOT encode
   *                 framework details, HTTP verbs, or infrastructure names
   *                 (Amendment C).
   * @param handler The handler that consumes a runtime payload ONLY
   *                (Amendment D). The ThemeConfig MUST NEVER be passed here.
   */
  register(actionId: string, handler: ActionHandler): void {
    this.handlers.set(actionId, handler);
  }

  /**
   * Resolves a stable action id to its handler.
   *
   * This is a pure dictionary lookup. It does NOT execute the handler.
   *
   * @param actionId The stable action id (e.g., 'cart.add').
   * @returns The handler, or undefined if the action id is not registered.
   */
  resolve(actionId: string): ActionHandler | undefined {
    return this.handlers.get(actionId);
  }

  /**
   * Lists all registered action ids.
   */
  list(): readonly string[] {
    return Array.from(this.handlers.keys());
  }
}
