/**
 * AWIE V2 - Phase 15.3: Music Plugin - Domain Types.
 *
 * ============================================================================
 * THE CONTRIBUTION CONTRACT
 * ============================================================================
 * The Music Plugin is a DOMAIN FEATURE, NOT an architectural exception. It
 * MUST use the existing Constitution. It does NOT create new SPIs, new
 * Readers, or new Composition logic. It does NOT define new execution
 * contexts and it does NOT bypass the Composer.
 *
 * The Music Plugin contributes through the EXISTING generic FeatureRecord
 * contract (Level B Refinement):
 *
 *   FeatureRecord.config  ->  MusicPluginConfig
 *   FeatureRecord.seo     ->  PluginSeoRecord (MusicRecording JSON-LD)
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
 * The Music Plugin NEVER produces a ThemeConfig itself. It only contributes
 * passive, strongly-typed domain data through the existing contract. The
 * Composer remains the SOLE ORCHESTRATOR.
 * ============================================================================
 */

/**
 * The high-fidelity audio engineering configuration contributed by the Music
 * Plugin.
 *
 * This is a STRICTLY TYPED domain payload. It captures the audio engineering
 * metadata that a music-focused site needs to render and describe its
 * recordings accurately.
 *
 * STRICT RULES:
 * - This is a passive data carrier. It carries NO composed Context and NO
 *   ThemeConfig.
 * - It is contributed through the EXISTING FeatureRecord<MusicPluginConfig>
 *   contract. It does NOT create a new SPI, Reader, or Composition logic.
 * - It is merged into ThemeConfig.resources.settings by the UNMODIFIED
 *   DefaultCompositionService.
 */
export interface MusicPluginConfig {
  /**
   * The sample rate of the master recording (e.g. '96kHz').
   *
   * High-fidelity audio engineering metadata. This is a display/engineering
   * value, NOT a runtime execution decision.
   */
  readonly sampleRate: string;

  /**
   * The bit depth of the master recording (e.g. '24-bit').
   *
   * High-fidelity audio engineering metadata. This is a display/engineering
   * value, NOT a runtime execution decision.
   */
  readonly bitDepth: string;

  /**
   * The acoustic texture descriptors of the recording (e.g. 'Wood resonance',
   * 'Felt-dampened').
   *
   * These are subjective, high-fidelity descriptors of the instrument's
   * acoustic character. They are passive domain data, NOT runtime logic.
   */
  readonly textures: string[];

  /**
   * The name of the recording (e.g. 'Nocturne in E-flat Major').
   */
  readonly name: string;

  /**
   * The artist / performer of the recording.
   */
  readonly byArtist: string;

  /**
   * The duration of the recording in ISO-8601 format (e.g. 'PT4M32S').
   */
  readonly duration: string;
}

/**
 * The stable plugin id for the Music Plugin.
 *
 * This is the value carried in FeatureRecord.pluginId. It identifies the
 * plugin that contributed the feature configuration.
 */
export const MUSIC_PLUGIN_ID = 'awie.plugin.music';
