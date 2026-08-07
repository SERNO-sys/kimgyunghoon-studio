/**
 * PromptBuilder — composable, versioned prompt construction.
 *
 * Prompts are assembled from named blocks so flows share common fragments
 * (language rules, JSON output contracts) without string duplication. The
 * `version` travels into telemetry via `GenerateOptions.promptVersion` so a
 * stored AI response can always be matched to the prompt contract that
 * produced it.
 */

export class PromptBuilder {
  private systemBlocks: string[] = [];
  private userBlocks: string[] = [];

  constructor(readonly version: string) {}

  /** Adds a block to the system instruction. */
  system(block: string): this {
    this.systemBlocks.push(block.trim());
    return this;
  }

  /** Adds a block to the user prompt. */
  user(block: string): this {
    this.userBlocks.push(block.trim());
    return this;
  }

  /** Adds labeled context data to the user prompt. */
  context(label: string, value: string): this {
    this.userBlocks.push(`${label}:\n${value.trim()}`);
    return this;
  }

  /**
   * Declares a strict raw-JSON output contract. Centralized here so every
   * structured flow forbids markdown fences with identical wording.
   */
  jsonOutput(shapeDescription: string): this {
    this.systemBlocks.push(
      [
        'Output contract:',
        `- Respond with ONLY a single valid, raw JSON value: ${shapeDescription.trim()}`,
        '- Do NOT wrap the JSON in a markdown code block (no ```json or ```).',
        '- Do NOT add any prose, explanation, or text before or after the JSON.',
        '- Every property name and string value MUST use double quotes.',
        '- Escape internal double quotes inside string values (\\").',
      ].join('\n')
    );
    return this;
  }

  buildSystem(): string {
    return this.systemBlocks.join('\n\n');
  }

  buildUser(): string {
    return this.userBlocks.join('\n\n');
  }
}
