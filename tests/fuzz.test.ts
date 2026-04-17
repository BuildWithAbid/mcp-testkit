import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHarness } from "../src/harness/index.js";
import { fuzzTool, fuzzAllTools } from "../src/fuzz/index.js";

function createRobustServer(): McpServer {
  const server = new McpServer({ name: "robust-server", version: "1.0.0" });

  server.tool(
    "echo",
    "Echo the input back",
    { message: z.string().describe("Message to echo") },
    async ({ message }) => ({
      content: [{ type: "text" as const, text: message }],
    })
  );

  server.tool(
    "divide",
    "Divide two numbers",
    {
      a: z.number().describe("Numerator"),
      b: z.number().describe("Denominator"),
    },
    async ({ a, b }) => {
      if (b === 0) {
        return {
          content: [{ type: "text" as const, text: "Cannot divide by zero" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: String(a / b) }],
      };
    }
  );

  return server;
}

describe("Fuzz Testing", () => {
  it("fuzz tests a single tool", async () => {
    const harness = await createHarness(createRobustServer());

    const result = await fuzzTool(harness, "echo", {
      runs: 20,
      seed: 42,
    });

    expect(result.runs).toBe(20);
    expect(result.passed + result.failed).toBe(20);

    await harness.close();
  });

  it("fuzz tests with custom assertion", async () => {
    const harness = await createHarness(createRobustServer());

    const result = await fuzzTool(harness, "divide", {
      runs: 20,
      seed: 42,
      assert: (toolResult) => {
        // Tool should always return content
        expect(toolResult.content.length).toBeGreaterThan(0);
      },
    });

    expect(result.runs).toBe(20);

    await harness.close();
  });

  it("fuzz tests all tools", async () => {
    const harness = await createHarness(createRobustServer());

    const results = await fuzzAllTools(harness, {
      runs: 10,
      seed: 42,
    });

    expect(results.size).toBe(2);
    expect(results.has("echo")).toBe(true);
    expect(results.has("divide")).toBe(true);

    await harness.close();
  });

  it("throws for non-existent tool", async () => {
    const harness = await createHarness(createRobustServer());

    await expect(fuzzTool(harness, "nonexistent")).rejects.toThrow(
      /Tool "nonexistent" not found/
    );

    await harness.close();
  });

  it("is reproducible with same seed", async () => {
    const harness1 = await createHarness(createRobustServer());
    const result1 = await fuzzTool(harness1, "echo", { runs: 10, seed: 12345 });
    await harness1.close();

    const harness2 = await createHarness(createRobustServer());
    const result2 = await fuzzTool(harness2, "echo", { runs: 10, seed: 12345 });
    await harness2.close();

    expect(result1.passed).toBe(result2.passed);
    expect(result1.failed).toBe(result2.failed);
  });
});
