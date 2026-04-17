import type { ToolResult } from "../types.js";

/**
 * Extract all text strings from a tool result's content array.
 */
export function getTexts(result: ToolResult): string[] {
  return result.content
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!);
}

/**
 * Get the first text content from a tool result, or undefined.
 */
export function getFirstText(result: ToolResult): string | undefined {
  const texts = getTexts(result);
  return texts[0];
}

/**
 * Check if any text content contains the given substring.
 */
export function hasText(result: ToolResult, substring: string): boolean {
  return getTexts(result).some((t) => t.includes(substring));
}
