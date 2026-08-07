/**
 * AWIE V2 - Phase 15.5: Commerce Plugin - Domain Types.
 *
 * ============================================================================
 * THE CONTRIBUTION CONTRACT
 * ============================================================================
 * The Commerce Plugin is a DOMAIN FEATURE, NOT an architectural exception.
 * It MUST use the existing Constitution. It does NOT create new SPIs, new
 * Readers, or new Composition logic. It does NOT define new execution
 * contexts and it does NOT bypass the Composer.
 *
 * The Commerce Plugin contributes through the EXISTING generic FeatureRecord
 * contract (Level B Refinement):
 *
 *   FeatureRecord.config  ->  CommercePluginConfig
 *   FeatureRecord.seo     ->  PluginSeoRecord (Product JSON-LD)
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
 * The Commerce Plugin NEVER produces a ThemeConfig itself. It only
 * contributes passive, strongly-typed domain data through the existing
 * contract. The Composer remains the SOLE ORCHESTRATOR.
 * ============================================================================
 *
 * ============================================================================
 * CRITICAL CONSTITUTIONAL RULE (LEVEL-A): COMMERCIAL STATE SEPARATION
 * (PRICE IS LIVE BUSINESS STATE)
 * ============================================================================
 * ThemeConfig is a STATIC execution contract for RENDERING the UI (product
 * gallery, review widgets, variant selectors). It is NOT a live-state
 * container.
 *
 * The Commerce Plugin MUST ONLY contribute STATIC CATALOG UI configuration.
 * The following are FORBIDDEN in CommercePluginConfig:
 *
 *   - price / priceRange / currency   (dynamic, per user / locale / promotion)
 *   - inventory / stock / quantity    (mutable availability)
 *   - promotions / discounts          (dynamic commercial state)
 *   - cart / cartItems                (transaction state)
 *   - checkout / paymentStatus        (transaction state)
 *   - any per-request runtime value
 *
 * PRICING IS DYNAMIC: Pricing is resolved per user, per locale, per promotion
 * by the APPLICATION layer AFTER the initial render. It is NEVER part of the
 * ThemeConfig.
 *
 * STRUCTURED DATA: The plugin contributes ONLY the STATIC structural parts of
 * the Product JSON-LD schema via FeatureRecord.seo.jsonLd. Dynamic live
 * pricing for SEO is handled by the Application layer, NOT the CMS Core.
 *
 * This rule keeps the Runtime pure (ADR-008): the Runtime renders what the
 * ThemeConfig describes; it NEVER resolves, edits, composes, validates, or
 * decides on live commercial state.
 * ============================================================================
 */

/**
 * The static catalog UI configuration contributed by the Commerce Plugin.
 *
 * This is a STRICTLY TYPED domain payload. It captures ONLY the static
 * catalog presentation configuration needed to RENDER the product interface
 * (gallery style, review toggle, variant display limit).
 *
 * STRICT RULES:
 * - This is a passive data carrier. It carries NO composed Context and NO
 *   ThemeConfig.
 * - It is contributed through the EXISTING FeatureRecord<CommercePluginConfig>
 *   contract. It does NOT create a new SPI, Reader, or Composition logic.
 * - It is merged into ThemeConfig.resources.settings by the UNMODIFIED
 *   DefaultCompositionService.
 * - COMMERCIAL STATE SEPARATION: It MUST NOT contain price, inventory,
 *   promotions, cart, or checkout state. Those are live business state and
 *   are resolved by the Application layer AFTER rendering.
 */
export interface CommercePluginConfig {
  /**
   * The presentation style of the product gallery.
   *
   * This is STATIC catalog UI configuration. It configures how the product
   * gallery is rendered. It is NOT live commercial state.
   */
  readonly productGalleryStyle: 'grid' | 'carousel' | 'list';

  /**
   * Whether the product review widget is enabled.
   *
   * This is STATIC catalog UI configuration. It toggles the review UI. It is
   * NOT live commercial state.
   */
  readonly enableReviews: boolean;

  /**
   * The maximum number of product variants to display in the selector.
   *
   * This is STATIC catalog UI configuration. It limits the variant selector
   * UI. It is NOT live commercial state.
   */
  readonly maxVariantsDisplay: number;
}

/**
 * The stable plugin id for the Commerce Plugin.
 *
 * This is the value carried in FeatureRecord.pluginId. It identifies the
 * plugin that contributed the feature configuration.
 */
export const COMMERCE_PLUGIN_ID = 'awie.plugin.commerce';
