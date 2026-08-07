/**
 * The single JSON sanitizer for AI responses.
 *
 * LLMs frequently wrap JSON in markdown code fences (```json ... ```), prepend
 * prose ("Here is the JSON:"), or append trailing commentary. Every structured
 * flow in AWIE must go through this ONE function so the tolerance rules stay
 * consistent and are fixed in exactly one place.
 */

/**
 * Extracts the best-effort JSON object/array payload from a raw model
 * response. Returns an empty string when nothing JSON-like is present.
 */
export function extractJsonPayload(raw: string): string {
  let cleaned = raw
    .trim()
    // Remove ```json / ``` fences anywhere in the string first, so a fence
    // directly before `{` does not survive the prefix strip below.
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  // Remove any leading prose up to the first `{` or `[`.
  const firstBrace = cleaned.search(/[{[]/);
  if (firstBrace === -1) return '';
  cleaned = cleaned.slice(firstBrace);

  // Remove trailing prose after the last `}` or `]`.
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (lastBrace === -1) return '';
  return cleaned.slice(0, lastBrace + 1).trim();
}

/**
 * Sanitizes and parses a raw model response into JSON.
 * Returns `null` when the response contains no parseable JSON.
 */
export function parseJsonResponse(raw: string): unknown | null {
  const payload = extractJsonPayload(raw);
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
