/**
 * AWIE V2 - Phase 15.7: Analytics Plugin - Domain Types.
 *
 * ============================================================================
 * THE CONTRIBUTION CONTRACT
 * ============================================================================
 * The Analytics Plugin is a DOMAIN FEATURE, NOT an architectural exception.
 * It MUST use the existing Constitution. It does NOT create new SPIs, new
 * Readers, or new Composition logic. It does NOT define new execution
 * contexts and it does NOT bypass the Composer.
 *
 * The Analytics Plugin contributes through the EXISTING generic FeatureRecord
 * contract (Level B Refinement):
 *
 *   FeatureRecord.config  ->  AnalyticsPluginConfig
 *
 * The UNMODIFIED DefaultCompositionService consumes this FeatureRecord and
 * deterministically merges it into the final ThemeConfig:
 *
 *   - FeatureRecord.config is merged into ThemeConfig.resources.settings
 *     (via the Composer's readSettings merge).
 *
 * The Analytics Plugin NEVER produces a ThemeConfig itself. It only
 * contributes passive, strongly-typed domain data through the existing
 * contract. The Composer remains the SOLE ORCHESTRATOR.
 * ============================================================================
 *
 * ============================================================================
 * CRITICAL CONSTITUTIONAL RULE (LEVEL-A): OBSERVATION WITHOUT INFLUENCE
 * (ANALYTICS IS OUTBOUND-ONLY)
 * ============================================================================
 * The Master Constitution for Product Plugins:
 *
 *   "ThemeConfig contains only deterministic presentation contracts. Any
 *    live, user-specific, transactional, observational, or mutable state
 *    belongs to the Application layer."
 *
 * For Analytics, the core rule is OBSERVATION WITHOUT INFLUENCE. Analytics is
 * OUTBOUND-ONLY: it observes and reports; it NEVER influences composition.
 *
 * 1. CONSENT UI vs. CONSENT STATE:
 *    - The plugin contributes the Consent Banner UI config.
 *    - It MUST NOT contribute the Consent State (User Accepted/Rejected).
 *
 * 2. EXPERIMENT DEFINITION vs. ASSIGNMENT:
 *    - The plugin contributes Experiment Definitions (e.g., A/B test setups).
 *    - It MUST NOT contribute the Experiment Assignment (Variant A/B).
 *    - The Composer and CompositionIdentity remain completely blind to which
 *      variant a user sees.
 *
 * 3. EVENT SCHEMA vs. RESULTS:
 *    - The plugin contributes Event Definitions (PageView, Purchase).
 *    - It MUST NOT track live results or revenue within the CMS core.
 *
 * 4. NO NEW CORE LOGIC:
 *    - Do not create new Readers or SPIs. Use the existing generic
 *      FeatureRecord<TConfig>.
 * ============================================================================
 */

/**
 * A single experiment definition (e.g., an A/B test setup).
 *
 * This is a STATIC DEFINITION. It describes the experiment's identity and
 * variants. It does NOT carry the ASSIGNMENT (which variant a given user
 * sees). The Composer and CompositionIdentity remain completely blind to
 * variant assignment.
 */
export interface ExperimentDefinition {
  /**
   * The stable id of the experiment.
   */
  readonly id: string;

  /**
   * The human-readable name of the experiment.
   */
  readonly name: string;

  /**
   * The static list of variant ids that the experiment may assign.
   *
   * This is a DEFINITION, not an ASSIGNMENT. It enumerates the possible
   * variants. It does NOT record which variant any user is currently seeing.
   */
  readonly variants: readonly string[];
}

/**
 * A single event definition (e.g., PageView, Purchase).
 *
 * This is a STATIC SCHEMA. It describes the shape of an event that the
 * Application layer may emit. It does NOT track live results or revenue
 * within the CMS core.
 */
export interface EventSchema {
  /**
   * The stable name of the event (e.g., 'page_view', 'purchase').
   */
  readonly name: string;

  /**
   * The static list of property keys the event carries.
   */
  readonly properties: readonly string[];
}

/**
 * The static UI/presentation configuration contributed by the Analytics
 * Plugin.
 *
 * This is a STRICTLY TYPED domain payload. It captures ONLY the static
 * presentation configuration needed to RENDER the analytics/consent UI and
 * to describe the tracking setup (tracking ids, consent banner style,
 * experiment definitions, event schemas).
 *
 * STRICT RULES:
 * - This is a passive data carrier. It carries NO composed Context and NO
 *   ThemeConfig.
 * - It is contributed through the EXISTING FeatureRecord<AnalyticsPluginConfig>
 *   contract. It does NOT create a new SPI, Reader, or Composition logic.
 * - It is merged into ThemeConfig.resources.settings by the UNMODIFIED
 *   DefaultCompositionService.
 * - OBSERVATION WITHOUT INFLUENCE: It MUST NOT contain live states
 *   (consentState, currentVariant, visitorSession), experiment assignments,
 *   or analytics results. Those are Application-layer concerns resolved AFTER
 *   rendering.
 */
export interface AnalyticsPluginConfig {
  /**
   * The static list of tracking ids (e.g., analytics provider ids).
   *
   * This is STATIC tracking configuration. It identifies the tracking
   * destinations. It is NOT live tracking state.
   */
  readonly trackingIds: readonly string[];

  /**
   * The presentation style of the consent banner.
   *
   * This is STATIC UI configuration. It configures how the consent banner is
   * rendered. It is NOT the consent state (User Accepted/Rejected).
   */
  readonly consentBannerStyle: 'banner' | 'modal' | 'inline';

  /**
   * The static list of experiment definitions (e.g., A/B test setups).
   *
   * This is a DEFINITION, not an ASSIGNMENT. It describes the experiments.
   * It does NOT record which variant a user sees.
   */
  readonly experimentDefinitions: readonly ExperimentDefinition[];

  /**
   * The static list of event schemas (e.g., PageView, Purchase).
   *
   * This is a SCHEMA, not a result. It describes the shape of events. It does
   * NOT track live results or revenue within the CMS core.
   */
  readonly eventSchemas: readonly EventSchema[];
}

/**
 * The stable plugin id for the Analytics Plugin.
 *
 * This is the value carried in FeatureRecord.pluginId. It identifies the
 * plugin that contributed the feature configuration.
 */
export const ANALYTICS_PLUGIN_ID = 'awie.plugin.analytics';
