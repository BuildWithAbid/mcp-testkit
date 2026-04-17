import { toHaveToolNamed, toHaveToolCount, toHaveInputSchema, toHaveToolDescription } from "./tool-matchers.js";
import { toBeSuccessful, toBeToolError, toHaveTextContent, toHaveContentCount, toHaveContentType } from "./result-matchers.js";

/**
 * All custom matchers for vitest/jest.
 *
 * Usage with vitest:
 * ```ts
 * import { expect } from "vitest";
 * import { mcpMatchers } from "mcp-testkit/matchers";
 * expect.extend(mcpMatchers);
 * ```
 *
 * Or use the setup helper:
 * ```ts
 * // vitest.config.ts
 * export default { test: { setupFiles: ["mcp-testkit/setup/vitest"] } }
 * ```
 */
export const mcpMatchers = {
  // Tool discovery matchers
  toHaveToolNamed,
  toHaveToolCount,
  toHaveInputSchema,
  toHaveToolDescription,

  // Tool result matchers
  toBeSuccessful,
  toBeToolError,
  toHaveTextContent,
  toHaveContentCount,
  toHaveContentType,
};

// Re-export individual matchers for tree-shaking
export {
  toHaveToolNamed,
  toHaveToolCount,
  toHaveInputSchema,
  toHaveToolDescription,
  toBeSuccessful,
  toBeToolError,
  toHaveTextContent,
  toHaveContentCount,
  toHaveContentType,
};
