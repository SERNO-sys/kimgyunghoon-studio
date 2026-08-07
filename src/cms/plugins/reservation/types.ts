/**
 * AWIE V2 - Phase 15.4: Reservation Plugin - Domain Types.
 *
 * ============================================================================
 * THE CONTRIBUTION CONTRACT
 * ============================================================================
 * The Reservation Plugin is a DOMAIN FEATURE, NOT an architectural exception.
 * It MUST use the existing Constitution. It does NOT create new SPIs, new
 * Readers, or new Composition logic. It does NOT define new execution
 * contexts and it does NOT bypass the Composer.
 *
 * The Reservation Plugin contributes through the EXISTING generic FeatureRecord
 * contract (Level B Refinement):
 *
 *   FeatureRecord.config  ->  ReservationPluginConfig
 *   FeatureRecord.seo     ->  PluginSeoRecord (Event / Reservation JSON-LD)
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
 * The Reservation Plugin NEVER produces a ThemeConfig itself. It only
 * contributes passive, strongly-typed domain data through the existing
 * contract. The Composer remains the SOLE ORCHESTRATOR.
 * ============================================================================
 *
 * ============================================================================
 * CRITICAL CONSTITUTIONAL RULE: STRICT SEPARATION OF PRESENTATION AND
 * TRANSACTION (NO LIVE STATE IN THEME-CONFIG)
 * ============================================================================
 * ThemeConfig is a STATIC execution contract for RENDERING the UI (forms,
 * calendar UI, buttons). It is NOT a live-state container.
 *
 * The Reservation Plugin MUST NOT contribute live business state to the
 * ThemeConfig. The following are FORBIDDEN in ReservationPluginConfig:
 *
 *   - remainingSlots          (mutable availability)
 *   - availableTime           (mutable availability)
 *   - paymentStatus           (mutable transaction state)
 *   - bookingConfirmed        (mutable transaction state)
 *   - any per-request runtime value
 *
 * EXECUTION (availability checks, booking, payment) happens via Application
 * APIs AFTER rendering. The ThemeConfig only carries the STATIC UI/policy
 * configuration needed to render the reservation interface.
 *
 * This rule keeps the Runtime pure (ADR-008): the Runtime renders what the
 * ThemeConfig describes; it NEVER resolves, edits, composes, validates, or
 * decides on live business state.
 * ============================================================================
 */

/**
 * A single operating-hours entry for the reservation interface.
 *
 * This is STATIC UI/policy configuration. It describes when the business is
 * open for reservations. It carries NO live availability state.
 */
export interface OperatingHoursEntry {
  /** The day of the week (e.g. 'monday'). */
  readonly day: string;
  /** The opening time in 24h HH:mm format (e.g. '09:00'). */
  readonly open: string;
  /** The closing time in 24h HH:mm format (e.g. '18:00'). */
  readonly close: string;
}

/**
 * The static UI/policy configuration contributed by the Reservation Plugin.
 *
 * This is a STRICTLY TYPED domain payload. It captures ONLY the static
 * configuration needed to RENDER the reservation interface (booking window,
 * party-size policy, operating hours).
 *
 * STRICT RULES:
 * - This is a passive data carrier. It carries NO composed Context and NO
 *   ThemeConfig.
 * - It is contributed through the EXISTING FeatureRecord<ReservationPluginConfig>
 *   contract. It does NOT create a new SPI, Reader, or Composition logic.
 * - It is merged into ThemeConfig.resources.settings by the UNMODIFIED
 *   DefaultCompositionService.
 * - NO LIVE STATE: It MUST NOT contain mutable business state (remainingSlots,
 *   availableTime, paymentStatus, etc.). Execution happens via Application
 *   APIs AFTER rendering.
 */
export interface ReservationPluginConfig {
  /**
   * The number of days into the future a reservation can be booked.
   *
   * This is a STATIC UI/policy value. It configures the booking calendar
   * window. It is NOT live availability state.
   */
  readonly bookingWindowDays: number;

  /**
   * The maximum party size allowed per reservation.
   *
   * This is a STATIC UI/policy value. It configures the party-size selector.
   * It is NOT live availability state.
   */
  readonly maxPartySize: number;

  /**
   * The operating hours for the reservation interface.
   *
   * This is STATIC UI/policy configuration. It describes when the business is
   * open for reservations. It carries NO live availability state.
   */
  readonly operatingHours: OperatingHoursEntry[];
}

/**
 * The stable plugin id for the Reservation Plugin.
 *
 * This is the value carried in FeatureRecord.pluginId. It identifies the
 * plugin that contributed the feature configuration.
 */
export const RESERVATION_PLUGIN_ID = 'awie.plugin.reservation';
