/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Output helpers.
 *
 * A tiny, dependency-free console output helper. It provides consistent,
 * colorized (when supported) output for the CLI.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This module
 *   is pure infrastructure; it contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

/**
 * A minimal output abstraction. It is injectable so the CLI can be tested
 * without capturing process.stdout.
 */
export interface Output {
  /** Writes a plain line. */
  info(message: string): void;
  /** Writes a success line (green). */
  success(message: string): void;
  /** Writes a warning line (yellow). */
  warn(message: string): void;
  /** Writes an error line (red). */
  error(message: string): void;
  /** Writes a section header. */
  header(message: string): void;
}

/**
 * Returns whether ANSI color codes are supported in the current environment.
 */
function supportsColor(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.stdout !== undefined &&
    Boolean(process.stdout.isTTY)
  );
}

const COLOR = {
  reset: '\u001b[0m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  cyan: '\u001b[36m',
  bold: '\u001b[1m',
};

/**
 * Creates a console-backed Output.
 *
 * @returns An Output that writes to the console.
 */
export function createConsoleOutput(): Output {
  const color = supportsColor();
  const paint = (code: string, text: string): string =>
    color ? `${code}${text}${COLOR.reset}` : text;

  return {
    info: (message) => console.log(message),
    success: (message) => console.log(paint(COLOR.green, message)),
    warn: (message) => console.log(paint(COLOR.yellow, message)),
    error: (message) => console.error(paint(COLOR.red, message)),
    header: (message) =>
      console.log(paint(COLOR.bold + COLOR.cyan, `\n${message}\n`)),
  };
}
