import { describe, it, expect, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHarness } from "../src/harness/index.js";
import { mcpMatchers } from "../src/matchers/index.js";
import type { McpTestHarness } from "../src/types.js";

expect.extend(mcpMatchers);

function createTestServer(): McpServer {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });

  server.tool(
    "greet",
    "Greet a user by name",
    { name: z.string().describe("The name to greet") },
    async ({ name }) => ({
      content: [{ type: "text" as const, text: `Hello, ${name}!` }],
    })
  );

  server.tool(
    "add",
    "Add two numbers",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
    async ({ a, b }) => ({
      content: [{ type: "text" as const, text: String(a + b) }],
    })
  );

  server.tool(
    "fail",
    "A tool that always fails",
    {},
    async () => ({
      content: [{ type: "text" as const, text: "Something went wrong" }],
      isError: true,
    })
  );

  return server;
}

describe("McpTestHarness", () => {
  let harness: McpTestHarness;

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it("creates an in-memory harness from McpServer", async () => {
    harness = await createHarness(createTestServer());
    expect(harness).toBeDefined();
    expect(harness.client).toBeDefined();
  });

  it("lists all tools", async () => {
    harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveLength(3);
    expect(tools).toHaveToolNamed("greet");
    expect(tools).toHaveToolNamed("add");
    expect(tools).toHaveToolNamed("fail");
  });

  it("calls a tool and gets a result", async () => {
    harness = await createHarness(createTestServer());
    const result = await harness.callTool("greet", { name: "World" });
    expect(result).toBeSuccessful();
    expect(result).toHaveTextContent("Hello, World!");
    expect(result).toHaveContentCount(1);
    expect(result).toHaveContentType("text");
  });

  it("detects tool errors", async () => {
    harness = await createHarness(createTestServer());
    const result = await harness.callTool("fail", {});
    expect(result).toBeToolError();
    expect(result).toHaveTextContent("Something went wrong");
  });

  it("calls add tool correctly", async () => {
    harness = await createHarness(createTestServer());
    const result = await harness.callTool("add", { a: 2, b: 3 });
    expect(result).toBeSuccessful();
    expect(result).toHaveTextContent("5");
  });

  it("checks tool count", async () => {
    harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveToolCount(3);
  });

  it("checks tool description", async () => {
    harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveToolDescription("greet", "Greet a user");
    expect(tools).toHaveToolDescription("greet", /user/i);
  });

  it("checks tool input schema", async () => {
    harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveInputSchema("add", { a: {}, b: {} });
  });

  it("close is idempotent", async () => {
    harness = await createHarness(createTestServer());
    await harness.close();
    await harness.close(); // Should not throw
  });
});
