/**
 * AWIE V2 - Phase 13: Plugin SDK - barrel export.
 *
 * The Plugin SDK is the public-facing contract that external developers use to
 * author a Plugin. A Plugin may register new Renderers, Themes, or Components
 * STRICTLY by abiding by:
 *
 *   - Contract 001 (ThemeConfig): the immutable Single Source of Truth.
 *   - Contract 002 (RenderNode): the pure, serializable, framework-agnostic
 *     virtual node tree.
 *
 * Every Plugin is validated against the CompatibilityMatrix before it is
 * accepted by the platform.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This SDK does NOT modify the core. It
 * provides the extension surface ON TOP of the frozen core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

export type {
  AwieCoreTarget,
  AwieExtension,
  AwieExtensionKind,
  AwiePlugin,
  AwiePluginIdentity,
  AwiePluginValidationResult,
  AwieRenderContext,
  AwieRenderFunction,
} from './types';
export { toPluginIdentity } from './types';

export type { RendererExtension } from './renderer-extension';

export type {
  ThemeExtension,
  ThemeSkin,
  ThemeTypography,
} from './theme-extension';

export type {
  AwieComponent,
  ComponentExtension,
} from './component-extension';

export type {
  PluginCapabilities,
  PluginManifest,
} from './manifest';
export { declaredExtensionKinds } from './manifest';

export type {
  PluginLifecycleState,
} from './lifecycle';
export {
  canTransition,
  PLUGIN_LIFECYCLE_TRANSITIONS,
  PluginLifecycle,
  PluginLifecycleError,
} from './lifecycle';

export type {
  SemVer,
  SemVerConstraint,
  SemVerOperator,
  SemVerRange,
} from './semver';
export {
  compareSemVer,
  InvalidSemVerError,
  InvalidSemVerRangeError,
  parseSemVer,
  parseSemVerConstraint,
  parseSemVerRange,
  satisfiesConstraint,
  satisfiesRange,
  versionSatisfies,
} from './semver';

export type {
  ComponentRegistryPort,
  LoadedPluginArtifacts,
  PluginContext,
  PluginLoadResult,
  PluginRecord,
  PluginRegistryPorts,
  RendererRegistryPort,
  ThemeRegistryPort,
} from './loader';
export {
  PluginCollisionError,
  PluginLoader,
  PluginValidationError,
} from './loader';

export type {
  PluginCapability,
  RuntimeStub,
  ThemeFixture,
} from './test-harness';
export {
  createRuntimeStub,
  createThemeFixture,
} from './test-harness';



