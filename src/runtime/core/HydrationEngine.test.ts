/**
 * AWIE V2 - Phase 16.1: Application Runtime Foundation - Hydration Engine
 * tests.
 *
 * These tests prove the Core Constitution:
 *   - The ThemeConfig is STRICTLY IMMUTABLE.
 *   - The Runtime MUST NEVER mutate the ThemeConfig.
 *   - The UI is the result of ThemeConfig (Immutable) + RuntimeState (Mutable
 *     Overlay).
 *
 * The central assertion: the original ThemeConfig remains strictly unmodified
 * (deep equality check) after the Hydration Engine processes a state update
 * (e.g., overlaying a live price onto a static product component).
 *
 * Run with: npx tsx src/runtime/core/HydrationEngine.test.ts
 */

import { HydrationEngine } from './HydrationEngine';
import { StateStore } from './StateStore';
import type {
  IAction,
  IActionRegistry,
  ILiveDataAdapter,
  IPermissionResolver,
  IRuntimeContext,
  PermissionSnapshot,
  RuntimeState,
} from './types';


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
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A static ThemeConfig describing a product component with a STATIC price.
 *
 * This is the IMMUTABLE "canvas" (UI structure). The Runtime MUST NEVER mutate
 * it. Live prices are overlaid via RuntimeState, NOT merged into this object.
 */
function createStaticThemeConfig(): Record<string, unknown> {
  return {
    metadata: {
      generator: 'awie-cms-composition',
      generatorVersion: '2.0.0',
      title: 'Studio Ceramics',
      locale: 'ko-KR',
    },
    resources: {
      pages: [{ id: 'home', route: '/', sectionIds: ['product'] }],
      sections: [
        {
          id: 'product',
          type: 'product',
          content: {
            name: 'Handcrafted Mug',
            // STATIC price. The live price is overlaid via RuntimeState.
            price: 100,
            currency: 'USD',
          },
        },
      ],
    },
  };
}

/**
 * A simple in-memory ActionRegistry.
 */
class MemoryActionRegistry implements IActionRegistry {
  private readonly actions = new Map<string, IAction>();

  register(action: IAction): void {
    this.actions.set(action.id, action);
  }

  get(id: string): IAction | undefined {
    return this.actions.get(id);
  }

  list(): readonly string[] {
    return [...this.actions.keys()];
  }
}

/**
 * A PermissionResolver that permits a fixed set of actions.
 */
class AllowListPermissionResolver implements IPermissionResolver {
  constructor(private readonly allowed: readonly string[]) {}

  can(_context: IRuntimeContext, actionId: string): boolean {
    return this.allowed.includes(actionId);
  }
}

/**
 * A LiveDataAdapter that returns a live price for a given target.
 */
class PriceLiveDataAdapter implements ILiveDataAdapter {
  constructor(private readonly livePrice: number) {}

  fetch(targetId: string): { targetId: string; value: unknown } | undefined {
    if (targetId === 'product') {
      return { targetId, value: { price: this.livePrice } };
    }
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  section('The ThemeConfig remains strictly unmodified after overlaying a live price');
  {
    const staticThemeConfig = createStaticThemeConfig();
    const originalSnapshot = JSON.stringify(staticThemeConfig);

    // Build the Runtime dependencies.
    const actionRegistry = new MemoryActionRegistry();
    actionRegistry.register({
      id: 'add-to-cart',
      execute: () => undefined,
    });
    const permissionResolver = new AllowListPermissionResolver(['add-to-cart']);
    const liveDataAdapter = new PriceLiveDataAdapter(120);

    const engine = new HydrationEngine({
      actionRegistry,
      permissionResolver,
      liveDataAdapter,
    });

    // The RuntimeState overlay carries the LIVE price (120), NOT the static
    // price (100). The static ThemeConfig is untouched.
    const state: RuntimeState = {
      liveData: [{ targetId: 'product', value: { price: 120 } }],
      slices: {},
      userId: 'user-1',
      locale: 'ko-KR',
    };

    const result = await engine.hydrate(staticThemeConfig, state);

    // CORE CONSTITUTION: The original ThemeConfig is strictly unmodified.
    assert(
      JSON.stringify(staticThemeConfig) === originalSnapshot,
      'ThemeConfig is strictly unmodified (deep equality) after hydration',
    );

    // The static price is still 100 in the ThemeConfig.
    const staticSection = (staticThemeConfig.resources as Record<string, unknown>).sections as Array<Record<string, unknown>>;
    const staticContent = staticSection[0].content as Record<string, unknown>;
    assert(staticContent.price === 100, 'static price remains 100 in ThemeConfig');
    assert(staticContent.currency === 'USD', 'static currency remains USD in ThemeConfig');

    // The LIVE price (120) is carried in the hydration instruction, NOT in the
    // ThemeConfig.
    assert(result.instructions.length === 1, 'one hydration instruction is emitted');
    const instruction = result.instructions[0];
    assert(instruction.targetId === 'product', 'instruction targets the product component');
    const liveData = instruction.liveData as Record<string, unknown>;
    assert(liveData.price === 120, 'live price (120) is carried in the hydration instruction');
    assert(
      instruction.permittedActions?.includes('add-to-cart') === true,
      'permitted action is resolved',
    );
  }

  section('The StateStore holds the mutable overlay and never touches the ThemeConfig');
  {
    const store = new StateStore({
      liveData: [{ targetId: 'product', value: { price: 100 } }],
      slices: {},
    });

    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });

    // Immutable update: produces a NEW state object.
    const before = store.getState();
    store.setState({
      liveData: [{ targetId: 'product', value: { price: 130 } }],
    });
    const after = store.getState();

    assert(before !== after, 'setState produces a NEW state object (immutable update)');
    assert(notified === 1, 'subscriber is notified on state change');

    const liveData = after.liveData[0].value as Record<string, unknown>;
    assert(liveData.price === 130, 'live price is updated in the overlay');

    unsubscribe();
    store.setState({ userId: 'user-2' });
    assert(notified === 1, 'unsubscribed listener is no longer notified');
  }

  section('The Runtime patches DATA, never presentation');
  {
    const staticThemeConfig = createStaticThemeConfig();
    const originalSnapshot = JSON.stringify(staticThemeConfig);

    const actionRegistry = new MemoryActionRegistry();
    const permissionResolver = new AllowListPermissionResolver([]);
    const liveDataAdapter = new PriceLiveDataAdapter(150);

    const engine = new HydrationEngine({
      actionRegistry,
      permissionResolver,
      liveDataAdapter,
    });

    const state: RuntimeState = {
      liveData: [{ targetId: 'product', value: { price: 150 } }],
      slices: {},
    };

    const result = await engine.hydrate(staticThemeConfig, state);

    // The ThemeConfig is untouched.
    assert(
      JSON.stringify(staticThemeConfig) === originalSnapshot,
      'ThemeConfig is strictly unmodified after hydration',
    );

    // The live price is overlaid as DATA. The static presentation (name,
    // currency) is NOT touched by the Runtime.
    const liveData = result.instructions[0].liveData as Record<string, unknown>;
    assert(liveData.price === 150, 'live price is overlaid as data');
    assert(!('name' in liveData), 'Runtime does NOT patch presentation (name)');
    assert(!('currency' in liveData), 'Runtime does NOT patch presentation (currency)');
    assert(!('buttonColor' in liveData), 'Runtime does NOT patch presentation (buttonColor)');
  }

  section('The Hydration Engine is framework-agnostic (emits instructions, not UI)');
  {
    const staticThemeConfig = createStaticThemeConfig();

    const actionRegistry = new MemoryActionRegistry();
    const permissionResolver = new AllowListPermissionResolver([]);
    const liveDataAdapter = new PriceLiveDataAdapter(110);

    const engine = new HydrationEngine({
      actionRegistry,
      permissionResolver,
      liveDataAdapter,
    });

    const state: RuntimeState = {
      liveData: [{ targetId: 'product', value: { price: 110 } }],
      slices: {},
    };

    const result = await engine.hydrate(staticThemeConfig, state);

    // The engine emits HydrationInstructions (data), NOT framework-specific
    // UI. It does NOT depend on React, Vue, or any UI framework.
    assert(Array.isArray(result.instructions), 'engine emits an array of instructions');
    assert(result.instructions[0].targetId === 'product', 'instruction identifies the target component');
    assert(result.stateSnapshot.liveData.length === 1, 'engine emits a state snapshot');
    assert(
      typeof result.instructions[0].liveData === 'object',
      'instruction carries live data, not a rendered UI element',
    );
  }

  section('ADR-009: Semantic targetIds map to rich UI instructions (Level B)');
  {
    const staticThemeConfig = createStaticThemeConfig();

    const actionRegistry = new MemoryActionRegistry();
    const permissionResolver = new AllowListPermissionResolver([]);
    const liveDataAdapter = new PriceLiveDataAdapter(0);

    const engine = new HydrationEngine({
      actionRegistry,
      permissionResolver,
      liveDataAdapter,
    });

    // A PermissionSnapshot carrying SEMANTIC Component Identities (Amendment
    // B). These are strictly decoupled from DOM IDs, Framework IDs, or UUIDs.
    const snapshot: PermissionSnapshot = {
      version: '1.0.0',
      issuedAt: '2026-08-07T00:00:00.000Z',
      verdicts: [
        // A hidden target -> 'hide' instruction.
        { targetId: 'hero.login', visibility: 'hide', enabled: false },
        // A visible but disabled target -> 'skeleton' instruction.
        { targetId: 'pricing.button', visibility: 'show', enabled: false },
        // A visible and enabled target -> 'show' instruction.
        { targetId: 'nav.cart', visibility: 'show', enabled: true },
      ],
    };

    const state: RuntimeState = {
      liveData: [],
      slices: {},
      permissionSnapshot: snapshot,
    };

    const result = await engine.hydrate(staticThemeConfig, state);

    // The engine emits one instruction per verdict, keyed by the SEMANTIC
    // targetId (Amendment B). It does NOT invent DOM/Framework/UUID ids.
    assert(result.instructions.length === 3, 'one instruction per verdict is emitted');

    const byTarget = new Map(
      result.instructions.map((i) => [i.targetId, i.permission]),
    );

    // hero.login is hidden -> 'hide'.
    assert(byTarget.get('hero.login') === 'hide', 'hero.login maps to hide instruction');
    // pricing.button is visible but disabled -> 'skeleton'.
    assert(byTarget.get('pricing.button') === 'skeleton', 'pricing.button maps to skeleton instruction');
    // nav.cart is visible and enabled -> 'show'.
    assert(byTarget.get('nav.cart') === 'show', 'nav.cart maps to show instruction');

    // The snapshot metadata (version, issuedAt) is preserved for cache
    // debugging (Amendment A).
    assert(result.stateSnapshot.permissionSnapshot?.version === '1.0.0', 'snapshot version is preserved');
    assert(
      result.stateSnapshot.permissionSnapshot?.issuedAt === '2026-08-07T00:00:00.000Z',
      'snapshot issuedAt is preserved',
    );
  }

  section('ADR-009: The engine blindly trusts the snapshot (Zero Engine Rule)');
  {
    const staticThemeConfig = createStaticThemeConfig();

    const actionRegistry = new MemoryActionRegistry();
    const permissionResolver = new AllowListPermissionResolver([]);
    const liveDataAdapter = new PriceLiveDataAdapter(0);

    const engine = new HydrationEngine({
      actionRegistry,
      permissionResolver,
      liveDataAdapter,
    });

    // A snapshot that is deliberately "wrong" from a business-logic
    // perspective: an anonymous user is granted access to an admin panel. The
    // engine MUST NOT second-guess this. It only maps the verdict to an
    // instruction. It does NOT evaluate authorization rules.
    const snapshot: PermissionSnapshot = {
      version: '1.0.0',
      issuedAt: '2026-08-07T00:00:00.000Z',
      verdicts: [
        { targetId: 'admin.panel', visibility: 'show', enabled: true },
      ],
    };

    const state: RuntimeState = {
      liveData: [],
      slices: {},
      userId: 'anonymous',
      permissionSnapshot: snapshot,
    };

    const result = await engine.hydrate(staticThemeConfig, state);

    // The engine does NOT inspect the user, the session, or any policy. It
    // blindly trusts the snapshot and emits the 'show' instruction.
    assert(result.instructions.length === 1, 'one instruction is emitted');
    assert(result.instructions[0].targetId === 'admin.panel', 'instruction targets admin.panel');
    assert(result.instructions[0].permission === 'show', 'engine blindly trusts the snapshot (show)');

    // The engine does NOT mutate the snapshot or the ThemeConfig.
    assert(
      result.stateSnapshot.permissionSnapshot === snapshot,
      'engine does not mutate the permission snapshot',
    );
    assert(
      JSON.stringify(staticThemeConfig) === JSON.stringify(createStaticThemeConfig()),
      'engine does not mutate the ThemeConfig',
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();


