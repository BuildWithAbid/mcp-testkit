import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHarness } from "../src/harness/index.js";
import { mcpMatchers } from "../src/matchers/index.js";

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
  it("creates an in-memory harness from McpServer", async () => {
    const harness = await createHarness(createTestServer());
    expect(harness).toBeDefined();
    expect(harness.client).toBeDefined();
    await harness.close();
  });

  it("lists all tools", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveLength(3);
    expect(tools).toHaveToolNamed("greet");
    expect(tools).toHaveToolNamed("add");
    expect(tools).toHaveToolNamed("fail");
    await harness.close();
  });

  it("calls a tool and gets a result", async () => {
    const harness = await createHarness(createTestServer());
    const result = await harness.callTool("greet", { name: "World" });
    expect(result).toBeSuccessful();
    expect(result).toHaveTextContent("Hello, World!");
    expect(result).toHaveContentCount(1);
    expect(result).toHaveContentType("text");
    await harness.close();
  });

  it("detects tool errors", async () => {
    const harness = await createHarness(createTestServer());
    const result = await harness.callTool("fail", {});
    expect(result).toBeToolError();
    expect(result).toHaveTextContent("Something went wrong");
    await harness.close();
  });

  it("calls add tool correctly", async () => {
    const harness = await createHarness(createTestServer());
    const result = await harness.callTool("add", { a: 2, b: 3 });
    expect(result).toBeSuccessful();
    expect(result).toHaveTextContent("5");
    await harness.close();
  });

  it("checks tool count", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveToolCount(3);
    await harness.close();
  });

  it("checks tool description", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveToolDescription("greet", "Greet a user");
    expect(tools).toHaveToolDescription("greet", /user/i);
    await harness.close();
  });

  it("checks tool input schema", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    expect(tools).toHaveInputSchema("add", { a: {}, b: {} });
    await harness.close();
  });

  it("close is idempotent", async () => {
    const harness = await createHarness(createTestServer());
    await harness.close();
    await harness.close(); // Should not throw
  });
});
