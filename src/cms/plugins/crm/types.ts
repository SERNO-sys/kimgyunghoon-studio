/**
 * AWIE V2 - Phase 15.6: CRM & Membership Plugin - Domain Types.
 *
 * ============================================================================
 * THE CONTRIBUTION CONTRACT
 * ============================================================================
 * The CRM Plugin is a DOMAIN FEATURE, NOT an architectural exception.
 * It MUST use the existing Constitution. It does NOT create new SPIs, new
 * Readers, or new Composition logic. It does NOT define new execution
 * contexts and it does NOT bypass the Composer.
 *
 * The CRM Plugin contributes through the EXISTING generic FeatureRecord
 * contract (Level B Refinement):
 *
 *   FeatureRecord.config  ->  CrmPluginConfig
 *   FeatureRecord.seo     ->  PluginSeoRecord (Organization / ProfilePage JSON-LD)
 *
 * The UNMODIFIED DefaultCompositionService consumes this FeatureRecord and
 * deterministically merges it into the final ThemeConfig:
 *
 *   - FeatureRecord.config is merged into ThemeConfig.resources.settings
 *     (via the Composer's readSettings merge).
 *   - FeatureRecord.seo.jsonLd is concatenated into ThemeConfig.seo.jsonLd
 *     (via the Composer's concatJsonLd merge, in Global -> Local -> Plugin
 *     order).
 *
 * The CRM Plugin NEVER produces a ThemeConfig itself. It only contributes
 * passive, strongly-typed domain data through the existing contract. The
 * Composer remains the SOLE ORCHESTRATOR.
 * ============================================================================
 *
 * ============================================================================
 * CRITICAL CONSTITUTIONAL RULE (LEVEL-A): PRESENTATION VS. IDENTITY
 * (USER-AGNOSTIC COMPOSITION)
 * ============================================================================
 * The ultimate constitutional rule for Phase 15:
 *
 *   "ThemeConfig defines WHAT to show, never TO WHOM, WHEN, FOR HOW MUCH,
 *    or IF POSSIBLE."
 *
 * ThemeConfig is a STATIC, USER-AGNOSTIC execution contract. It describes
 * WHAT UI to render. It NEVER encodes identity, session, permission, or
 * personalization.
 *
 * 1. USER-AGNOSTIC COMPOSITION:
 *    - Do NOT extend CompositionIdentity with user segments.
 *    - The Composer MUST remain 100% blind to sessions, users, and
 *      permissions.
 *
 * 2. NO PROTECTED CONTENT IN THEMECONFIG:
 *    - The ThemeConfig MUST NEVER contain protected business content (to
 *      prevent HTML source leaks) or personalized data (e.g., "Hello John").
 *    - It MAY ONLY contain gated UI components (e.g., premiumArticleLayout,
 *      loginFormStyle, memberBadgeUI).
 *
 * 3. HYDRATION STRATEGY:
 *    - Personalization and protected content fetching are Application-level
 *      hydration concerns executed via APIs AFTER the UI is rendered.
 *
 * The CRM Plugin contributes ONLY generic UI layout configs and
 * Organization/ProfilePage JSON-LD. It explicitly EXCLUDES sessions, JWTs,
 * user profiles, and protected data.
 * ============================================================================
 */

/**
 * The static UI/presentation configuration contributed by the CRM Plugin.
 *
 * This is a STRICTLY TYPED domain payload. It captures ONLY the static
 * presentation configuration needed to RENDER the auth/membership UI
 * (login form variant, premium badge style, member layout).
 *
 * STRICT RULES:
 * - This is a passive data carrier. It carries NO composed Context and NO
 *   ThemeConfig.
 * - It is contributed through the EXISTING FeatureRecord<CrmPluginConfig>
 *   contract. It does NOT create a new SPI, Reader, or Composition logic.
 * - It is merged into ThemeConfig.resources.settings by the UNMODIFIED
 *   DefaultCompositionService.
 * - PRESENTATION VS. IDENTITY: It MUST NOT contain user-specific state
 *   (userProfile, sessionToken, protectedContent), sessions, JWTs, user
 *   profiles, permissions, or personalized data. Those are Application-level
 *   hydration concerns resolved AFTER rendering.
 */
export interface CrmPluginConfig {
  /**
   * The presentation variant of the login form.
   *
   * This is STATIC UI configuration. It configures how the login form is
   * rendered. It is NOT identity, session, or user state.
   */
  readonly loginFormVariant: 'modal' | 'inline' | 'page';

  /**
   * The presentation style of the premium/member badge.
   *
   * This is STATIC UI configuration. It configures how the member badge is
   * rendered. It is NOT a user profile or membership entitlement.
   */
  readonly premiumBadgeStyle: 'gold' | 'silver' | 'minimal';

  /**
   * The presentation layout of the member dashboard.
   *
   * This is STATIC UI configuration. It configures how the member area is
   * laid out. It is NOT protected business content.
   */
  readonly memberLayout: 'sidebar' | 'topnav' | 'cards';
}

/**
 * The stable plugin id for the CRM Plugin.
 *
 * This is the value carried in FeatureRecord.pluginId. It identifies the
 * plugin that contributed the feature configuration.
 */
export const CRM_PLUGIN_ID = 'awie.plugin.crm';
