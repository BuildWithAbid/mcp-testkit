import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HarnessOptions, StdioHarnessConfig, McpTestHarness } from "../types.js";
import { createInMemoryHarness } from "./in-memory.js";
import { createStdioHarness } from "./stdio.js";

/**
 * Create a test harness for an MCP server.
 *
 * Pass an McpServer instance for fast in-memory testing:
 * ```ts
 * const harness = await createHarness(myServer);
 * ```
 *
 * Pass a StdioHarnessConfig for subprocess-based integration testing:
 * ```ts
 * const harness = await createHarness({
 *   command: "node",
 *   args: ["./dist/server.js"],
 * });
 * ```
 */
export function createHarness(
  serverOrConfig: McpServer | StdioHarnessConfig,
  options?: HarnessOptions
): Promise<McpTestHarness> {
  if ("command" in serverOrConfig) {
    return createStdioHarness(serverOrConfig, options);
  }
  return createInMemoryHarness(serverOrConfig, options);
}

export { createInMemoryHarness, createStdioHarness };
