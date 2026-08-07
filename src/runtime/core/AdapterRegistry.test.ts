/**
 * AWIE V2 - Phase 16.2: Application Runtime Foundation - Adapter Registry
 * tests.
 *
 * These tests prove:
 *   - The AdapterRegistry registers domain live data adapters.
 *   - triggerAll() routes each adapter's fetched data into the correct feature
 *     slice of the RuntimeState.
 *   - Updates in one slice do NOT overwrite other slices (slice isolation).
 *   - The resulting RuntimeState can be hydrated by the HydrationEngine
 *     WITHOUT mutating the immutable ThemeConfig.
 *
 * Run with: npx tsx src/runtime/core/AdapterRegistry.test.ts
 */

import { QueryClient } from '@tanstack/react-query';
import { AdapterRegistry } from './AdapterRegistry';
import { StateStore } from './StateStore';
import { HydrationEngine } from './HydrationEngine';
import { CommerceLiveAdapter } from '../providers/CommerceLiveAdapter';
import { ReservationLiveAdapter } from '../providers/ReservationLiveAdapter';
import { CrmLiveAdapter } from '../providers/CrmLiveAdapter';
import { AnalyticsLiveAdapter } from '../providers/AnalyticsLiveAdapter';
import type {
  IActionRegistry,
  ILiveDataAdapter,
  IPermissionResolver,
  IRuntimeContext,
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

class EmptyActionRegistry implements IActionRegistry {
  private readonly actions = new Map<string, never>();
  register(): void {}
  get(): undefined {
    return undefined;
  }
  list(): readonly string[] {
    return [];
  }
}

class AllowAllPermissionResolver implements IPermissionResolver {
  can(): boolean {
    return true;
  }
}

class NoopLiveDataAdapter implements ILiveDataAdapter {
  fetch(): undefined {
    return undefined;
  }
}

function createEmptyState(): RuntimeState {
  return {
    liveData: [],
    slices: {},
  };
}

/**
 * A shared QueryClient fixture. The domain adapters wrap this OSS library
 * handle behind the AWIE-owned IDomainLiveDataAdapter contract (ADR-007).
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  section('The AdapterRegistry registers all four domain adapters');
  {
    const queryClient = createQueryClient();
    const registry = new AdapterRegistry();
    registry.register(new CommerceLiveAdapter({ queryClient }));
    registry.register(new ReservationLiveAdapter({ queryClient }));
    registry.register(new CrmLiveAdapter({ queryClient }));
    registry.register(new AnalyticsLiveAdapter({ queryClient }));

    const slices = registry.list();
    assert(slices.length === 4, 'all four domain adapters are registered');
    assert(slices.includes('commerce'), 'commerce adapter is registered');
    assert(slices.includes('reservation'), 'reservation adapter is registered');
    assert(slices.includes('crm'), 'crm adapter is registered');
    assert(slices.includes('analytics'), 'analytics adapter is registered');

    assert(registry.get('commerce') instanceof CommerceLiveAdapter, 'commerce adapter resolves');
    assert(registry.get('reservation') instanceof ReservationLiveAdapter, 'reservation adapter resolves');
    assert(registry.get('crm') instanceof CrmLiveAdapter, 'crm adapter resolves');
    assert(registry.get('analytics') instanceof AnalyticsLiveAdapter, 'analytics adapter resolves');
  }

  section('triggerAll() routes live data into the correct feature slices');
  {
    const queryClient = createQueryClient();
    const registry = new AdapterRegistry();
    registry.register(new CommerceLiveAdapter({ queryClient }));
    registry.register(new ReservationLiveAdapter({ queryClient }));
    registry.register(new CrmLiveAdapter({ queryClient }));
    registry.register(new AnalyticsLiveAdapter({ queryClient }));

    const store = new StateStore(createEmptyState());
    const context: IRuntimeContext = {
      state: store.getState(),
      themeConfig: {},
    };

    await registry.triggerAll(store, context);

    const state = store.getState();
    assert(state.slices.commerce !== undefined, 'commerce slice is populated');
    assert(state.slices.reservation !== undefined, 'reservation slice is populated');
    assert(state.slices.crm !== undefined, 'crm slice is populated');
    assert(state.slices.analytics !== undefined, 'analytics slice is populated');

    const commerce = state.slices.commerce as Record<string, unknown>;
    assert(commerce.currency === 'USD', 'commerce slice carries currency data');

    const reservation = state.slices.reservation as Record<string, unknown>;
    const availability = reservation.availability as Record<string, unknown>;
    assert(availability.open === true, 'reservation slice carries availability data');
  }

  section('Updates in one slice do NOT overwrite other slices (slice isolation)');
  {
    const queryClient = createQueryClient();
    const registry = new AdapterRegistry();
    registry.register(new CommerceLiveAdapter({ queryClient }));
    registry.register(new ReservationLiveAdapter({ queryClient }));

    const store = new StateStore(createEmptyState());
    const context: IRuntimeContext = {
      state: store.getState(),
      themeConfig: {},
    };

    await registry.triggerAll(store, context);

    // Patch ONLY the commerce slice. The reservation slice must remain intact.
    store.patchSlice('commerce', { cart: { items: 3, total: 45 } });

    const state = store.getState();
    const commerce = state.slices.commerce as Record<string, unknown>;
    const cart = commerce.cart as Record<string, unknown>;
    assert(cart.items === 3, 'commerce slice is updated');

    const reservation = state.slices.reservation as Record<string, unknown>;
    const availability = reservation.availability as Record<string, unknown>;
    assert(availability.open === true, 'reservation slice is NOT overwritten by commerce update');
  }

  section('The hydrated RuntimeState overlays live data WITHOUT mutating the ThemeConfig');
  {
    const staticThemeConfig = {
      metadata: { title: 'Studio Ceramics', locale: 'ko-KR' },
      resources: {
        sections: [
          {
            id: 'cart',
            type: 'cart',
            content: { items: 0, total: 0 },
          },
        ],
      },
    };
    const originalSnapshot = JSON.stringify(staticThemeConfig);

    const queryClient = createQueryClient();
    const registry = new AdapterRegistry();
    registry.register(new CommerceLiveAdapter({ queryClient }));

    const store = new StateStore(createEmptyState());
    const context: IRuntimeContext = {
      state: store.getState(),
      themeConfig: staticThemeConfig,
    };

    await registry.triggerAll(store, context);

    // Overlay a live cart state onto the static cart component.
    store.patchSlice('commerce', { cart: { items: 2, total: 60 } });
    store.setState({
      liveData: [{ targetId: 'cart', value: { items: 2, total: 60 } }],
    });

    const engine = new HydrationEngine({
      actionRegistry: new EmptyActionRegistry(),
      permissionResolver: new AllowAllPermissionResolver(),
      liveDataAdapter: new NoopLiveDataAdapter(),
    });

    const result = await engine.hydrate(staticThemeConfig, store.getState());

    // CORE CONSTITUTION: The ThemeConfig is strictly unmodified.
    assert(
      JSON.stringify(staticThemeConfig) === originalSnapshot,
      'ThemeConfig is strictly unmodified after hydration',
    );

    // The live cart data is carried in the hydration instruction.
    const instruction = result.instructions[0];
    assert(instruction.targetId === 'cart', 'instruction targets the cart component');
    const liveData = instruction.liveData as Record<string, unknown>;
    assert(liveData.items === 2, 'live cart items are overlaid as data');
    assert(liveData.total === 60, 'live cart total is overlaid as data');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
