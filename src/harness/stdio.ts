import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { HarnessOptions, StdioHarnessConfig, McpTestHarness } from "../types.js";
import { wrapClient } from "./wrap-client.js";

/**
 * Create a test harness by spawning a server subprocess via stdio.
 * Best for integration/E2E tests.
 */
export async function createStdioHarness(
  config: StdioHarnessConfig,
  options: HarnessOptions = {}
): Promise<McpTestHarness> {
  const {
    clientName = "mcp-testkit",
    clientVersion = "1.0.0",
  } = options;

  const client = new Client({ name: clientName, version: clientVersion });

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env ? { ...process.env, ...config.env } as Record<string, string> : undefined,
    cwd: config.cwd,
  });

  await client.connect(transport);

  return wrapClient(client, async () => {
    await client.close();
  });
}
