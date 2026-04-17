import type { ToolResult } from "../types.js";

export function getTexts(result: ToolResult): string[] {
  return result.content
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!);
}

export function getFirstText(result: ToolResult): string | undefined {
  const item = result.content.find((c) => c.type === "text" && typeof c.text === "string");
  return item?.text;
}

export function hasText(result: ToolResult, substring: string): boolean {
  return getTexts(result).some((t) => t.includes(substring));
}
