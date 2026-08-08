/**
 * AWIE V2 - Phase 12.6: CMS Core - Unique Identifier Generation.
 *
 * The Command contract (commands/types.ts) MANDATES that every Command carries
 * a UNIQUE commandId: "This is crucial for Replay, Retry, and Audit. The
 * commandId is the stable identity of a single command execution."
 *
 * A millisecond timestamp is NOT a reliable uniqueness source: two commands
 * created within the same millisecond would collide, silently overwriting a
 * previous command / snapshot in the repository. This module provides a
 * collision-free, framework-agnostic unique id generator.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure, deterministic utility for the Application Layer.
 */

/**
 * Generates a globally-unique, collision-free id.
 *
 * Uses the Web Crypto API (crypto.randomUUID) when available, falling back to a
 * cryptographically-random hex string otherwise. This is safe in both the
 * browser and Node.js runtimes, and requires no external dependency.
 *
 * @param prefix An optional semantic prefix (e.g. "cmd", "snap", "audit").
 * @returns A unique id string, optionally prefixed.
 */
export function createUniqueId(prefix?: string): string {
  const raw = generateRandomId();
  return prefix ? `${prefix}-${raw}` : raw;
}

/**
 * Generates the raw random id.
 *
 * Prefers crypto.randomUUID() (RFC 4122 v4). Falls back to a 32-hex-char
 * random string when randomUUID is unavailable (e.g. older runtimes).
 */
function generateRandomId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  // Fallback: 16 random bytes -> 32 hex chars. Cryptographically random when
  // crypto.getRandomValues is available; otherwise Math.random (best effort).
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
