import type { ToolResult } from "../types.js";
import { getTexts } from "../helpers/text.js";

export function toBeSuccessful(result: ToolResult) {
  return {
    pass: !result.isError,
    message: () =>
      !result.isError
        ? `Expected tool result to be an error, but it succeeded`
        : `Expected tool result to succeed, but got error: ${getTexts(result).join("; ")}`,
  };
}

export function toBeToolError(result: ToolResult) {
  return {
    pass: !!result.isError,
    message: () =>
      result.isError
        ? `Expected tool result not to be an error`
        : `Expected tool result to be an error, but it succeeded with: ${getTexts(result).join("; ")}`,
  };
}

export function toHaveTextContent(result: ToolResult, expected: string | RegExp) {
  const texts = getTexts(result);
  const allText = texts.join("\n");

  const matches =
    typeof expected === "string"
      ? allText.includes(expected)
      : expected.test(allText);

  return {
    pass: matches,
    message: () =>
      matches
        ? `Expected tool result text not to match ${expected}`
        : `Expected tool result text to match ${expected}, got: "${allText.slice(0, 200)}"`,
  };
}

export function toHaveContentCount(result: ToolResult, count: number) {
  const actual = result.content.length;
  return {
    pass: actual === count,
    message: () =>
      actual === count
        ? `Expected tool result not to have ${count} content items`
        : `Expected ${count} content items, but found ${actual}`,
  };
}

export function toHaveContentType(result: ToolResult, type: string) {
  const found = result.content.some((c) => c.type === type);
  return {
    pass: found,
    message: () =>
      found
        ? `Expected tool result not to contain "${type}" content`
        : `Expected tool result to contain "${type}" content, found types: [${result.content.map((c) => `"${c.type}"`).join(", ")}]`,
  };
}
