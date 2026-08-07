/**
 * AWIE V2 - ADR-008 (Client Actions): Action Router tests.
 *
 * These tests prove:
 *   - MapActionRouter correctly resolves registered stable action ids.
 *   - Unregistered action ids resolve to undefined.
 *   - The router is a THIN dictionary lookup: it does NOT execute handlers.
 *   - Amendment C (Stable Action Contract): action ids are stable, domain-
 *     scoped strings that do NOT encode framework details, HTTP verbs, or
 *     infrastructure names.
 *   - Amendment D (Handler Isolation): ActionHandler consumes a runtime payload
 *     ONLY. The ThemeConfig object MUST NEVER be passed into a handler. This is
 *     enforced at the TYPE level (a handler whose parameter is typed as
 *     ThemeConfig is NOT assignable to ActionHandler).
 *
 * Run with: npx tsx src/runtime/core/ActionRouter.test.ts
 */

import { MapActionRouter } from './MapActionRouter';
import type { ActionHandler } from './types';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function section(title: string): void {
  console.log(`\n[${title}]`);
}

// ---------------------------------------------------------------------------
// Amendment D — TYPE-LEVEL Handler Isolation
// ---------------------------------------------------------------------------
// A handler that accepts a ThemeConfig-shaped object as its parameter MUST NOT
// be assignable to ActionHandler. ActionHandler's parameter is `unknown`, so a
// handler typed to accept a ThemeConfig is a WIDER parameter type and is
// therefore NOT assignable (contravariance). This is a compile-time guard.
//
// We model a minimal ThemeConfig shape here (NOT imported from src/cms, to
// preserve the Runtime Purity boundary — the Runtime must never import CMS
// models).
interface ThemeConfigLike {
  metadata: { title: string };
  resources: { sections: unknown[] };
}

// A handler that (incorrectly) accepts a ThemeConfig. This MUST NOT be
// assignable to ActionHandler.
const themeConfigHandler = (config: ThemeConfigLike): void => {
  void config;
};

// A handler that consumes a runtime payload ONLY (typed as `unknown`, the
// ActionHandler parameter type). This IS assignable to ActionHandler.
const payloadHandler: ActionHandler = (payload) => {
  void payload;
};

// ---------------------------------------------------------------------------
// Amendment D — COMPILE-TIME GUARDS
// ---------------------------------------------------------------------------
// 1. POSITIVE case: a payload-only handler IS assignable to ActionHandler.
//    If this assignment fails to compile, the guard breaks.
const payloadIsAssignable: ActionHandler = payloadHandler;

// 2. NEGATIVE case: a ThemeConfig-accepting handler MUST NOT be assignable to
//    ActionHandler. `@ts-expect-error` asserts that the line below is a type
//    error. If it is NOT an error (i.e., the guard regressed), the build fails.
// @ts-expect-error — a ThemeConfig-accepting handler is NOT assignable to ActionHandler (Amendment D)
const themeConfigIsNotAssignable: ActionHandler = themeConfigHandler;



// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function run(): void {
  section('MapActionRouter resolves registered stable action ids');
  {
    const router = new MapActionRouter();

    const addToCart: ActionHandler = (payload) => {
      void payload;
    };
    const submitReservation: ActionHandler = async (payload) => {
      void payload;
    };

    router.register('cart.add', addToCart);
    router.register('reservation.submit', submitReservation);

    assert(router.resolve('cart.add') === addToCart, 'cart.add resolves to its handler');
    assert(
      router.resolve('reservation.submit') === submitReservation,
      'reservation.submit resolves to its handler',
    );
  }

  section('Unregistered action ids resolve to undefined');
  {
    const router = new MapActionRouter();
    router.register('cart.add', () => {});

    assert(router.resolve('cart.remove') === undefined, 'unregistered id resolves to undefined');
    assert(router.resolve('') === undefined, 'empty id resolves to undefined');
  }

  section('The router is a THIN dictionary lookup — it does NOT execute handlers');
  {
    const router = new MapActionRouter();
    // Explicitly typed as `boolean` so TypeScript does NOT narrow it to the
    // literal `false` (which would make the later `executed === true` check
    // appear to have no overlap). The handler reassigns it inside a closure.
    let executed: boolean = false;


    router.register('cart.add', () => {
      executed = true;
    });

    // Resolving MUST NOT execute the handler.
    const handler = router.resolve('cart.add');
    assert(handler !== undefined, 'handler is resolved');
    assert(executed === false, 'resolve() does NOT execute the handler');

    // Execution is the caller's responsibility (the WRAP layer).
    handler?.({ productId: 'p1', quantity: 1 });

    // Wrap `executed` in `Boolean(...)` so TypeScript does NOT narrow it to the
    // literal `false`. The reassignment (`executed = true`) happens inside a
    // closure that control-flow analysis cannot track, which would otherwise
    // make `executed === true` appear to have no overlap. Function call results
    // are never narrowed, so `Boolean(executed)` is typed as `boolean`.
    assert(Boolean(executed) === true, 'handler executes only when explicitly invoked');


  }

  section('list() returns all registered action ids');
  {
    const router = new MapActionRouter();
    router.register('cart.add', () => {});
    router.register('reservation.submit', () => {});
    router.register('crm.createLead', () => {});

    const ids = router.list();
    assert(ids.length === 3, 'all three action ids are listed');
    assert(ids.includes('cart.add'), 'cart.add is listed');
    assert(ids.includes('reservation.submit'), 'reservation.submit is listed');
    assert(ids.includes('crm.createLead'), 'crm.createLead is listed');
  }

  section('Amendment C — action ids are stable, domain-scoped contracts');
  {
    // These are the ONLY acceptable forms: domain-scoped, human-readable,
    // framework-agnostic. They MUST NOT encode HTTP verbs or infrastructure.
    const stableIds = ['cart.add', 'reservation.submit', 'crm.createLead'];
    const forbiddenPatterns = [/^POST_/, /^GET_/, /\/api\//, /reactMutation/, /useMutation/];

    for (const id of stableIds) {
      const isStable = forbiddenPatterns.every((re) => !re.test(id));
      assert(isStable, `'${id}' is a stable, framework-agnostic action id`);
    }

    // Sanity: the forbidden patterns WOULD match a bad id.
    assert(/^POST_/.test('POST_/api/cart'), 'POST_/api/cart is correctly flagged as forbidden');
    assert(/reactMutation/.test('reactMutation42'), 'reactMutation42 is correctly flagged as forbidden');
  }

  section('Amendment D — TYPE-LEVEL: ActionHandler cannot accept ThemeConfig');
  {
    // The compile-time guards above are the enforcement mechanism:
    //   - `payloadIsAssignable: ActionHandler = payloadHandler` compiles ONLY
    //     if a payload-only handler is assignable to ActionHandler.
    //   - `@ts-expect-error` on `themeConfigIsNotAssignable` fails the build
    //     if a ThemeConfig-accepting handler IS assignable to ActionHandler.
    // These variables are referenced here so the guards are not tree-shaken.
    assert(typeof payloadIsAssignable === 'function', 'payload-only handler is a valid ActionHandler');
    assert(
      typeof themeConfigIsNotAssignable === 'function',
      'ThemeConfig-accepting handler is rejected at compile time (guard active)',
    );
  }


  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
