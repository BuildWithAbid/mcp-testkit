import type { ToolInfo } from "../types.js";

/**
 * Check if a tools array contains a tool with the given name.
 */
export function toHaveToolNamed(tools: ToolInfo[], name: string) {
  const found = tools.some((t) => t.name === name);
  return {
    pass: found,
    message: () =>
      found
        ? `Expected tools not to include "${name}", but it was found`
        : `Expected tools to include "${name}", but found: [${tools.map((t) => `"${t.name}"`).join(", ")}]`,
  };
}

/**
 * Check if a tools array has exactly N tools.
 */
export function toHaveToolCount(tools: ToolInfo[], count: number) {
  const actual = tools.length;
  return {
    pass: actual === count,
    message: () =>
      actual === count
        ? `Expected tools not to have ${count} tools`
        : `Expected ${count} tools, but found ${actual}`,
  };
}

/**
 * Check if a tool's input schema contains the expected properties.
 */
export function toHaveInputSchema(
  tools: ToolInfo[],
  toolName: string,
  expectedProps: Record<string, unknown>
) {
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    return {
      pass: false,
      message: () => `Tool "${toolName}" not found`,
    };
  }

  const actualProps = tool.inputSchema.properties ?? {};
  const expectedKeys = Object.keys(expectedProps);
  const missingKeys = expectedKeys.filter((k) => !(k in actualProps));

  return {
    pass: missingKeys.length === 0,
    message: () =>
      missingKeys.length === 0
        ? `Expected tool "${toolName}" not to have properties: ${expectedKeys.join(", ")}`
        : `Tool "${toolName}" missing expected properties: ${missingKeys.join(", ")}. Has: ${Object.keys(actualProps).join(", ")}`,
  };
}

/**
 * Check if a tool has a description matching a string or regex.
 */
export function toHaveToolDescription(
  tools: ToolInfo[],
  toolName: string,
  expected: string | RegExp
) {
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    return {
      pass: false,
      message: () => `Tool "${toolName}" not found`,
    };
  }

  const desc = tool.description ?? "";
  const matches =
    typeof expected === "string"
      ? desc.includes(expected)
      : expected.test(desc);

  return {
    pass: matches,
    message: () =>
      matches
        ? `Expected tool "${toolName}" description not to match ${expected}`
        : `Expected tool "${toolName}" description to match ${expected}, got: "${desc}"`,
  };
}
