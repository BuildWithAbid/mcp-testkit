import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HarnessOptions, McpTestHarness } from "../types.js";
import { wrapClient } from "./wrap-client.js";

/**
 * Create a test harness using InMemoryTransport (fast, no subprocess).
 * Best for unit tests.
 */
export async function createInMemoryHarness(
  server: McpServer,
  options: HarnessOptions = {}
): Promise<McpTestHarness> {
  const {
    clientName = "mcp-testkit",
    clientVersion = "1.0.0",
  } = options;

  const client = new Client({ name: clientName, version: clientVersion });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return wrapClient(client, async () => {
    await client.close();
    await server.close();
  });
}
