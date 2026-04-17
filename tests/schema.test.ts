import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHarness } from "../src/harness/index.js";
import { validateToolSchema, validateAllToolSchemas, generateValidInput, generateEdgeCaseInputs } from "../src/schema/index.js";

function createTestServer(): McpServer {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });

  server.tool(
    "search",
    "Search for items",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results"),
    },
    async ({ query }) => ({
      content: [{ type: "text" as const, text: `Results for: ${query}` }],
    })
  );

  server.tool(
    "no-desc",
    {
      input: z.string(),
    },
    async () => ({
      content: [{ type: "text" as const, text: "ok" }],
    })
  );

  return server;
}

describe("Schema Validation", () => {
  it("validates a well-formed tool schema", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    const search = tools.find((t) => t.name === "search")!;

    const issues = validateToolSchema(search);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);

    await harness.close();
  });

  it("warns about missing descriptions", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();
    const noDesc = tools.find((t) => t.name === "no-desc")!;

    const issues = validateToolSchema(noDesc);
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);

    await harness.close();
  });

  it("validates all tool schemas", async () => {
    const harness = await createHarness(createTestServer());
    const tools = await harness.listTools();

    const allIssues = validateAllToolSchemas(tools);
    expect(allIssues.size).toBeGreaterThan(0); // no-desc should have warnings

    await harness.close();
  });
});

describe("Input Generation", () => {
  it("generates valid input from schema", () => {
    const schema = {
      type: "object" as const,
      properties: {
        query: { type: "string" as const },
        limit: { type: "number" as const },
      },
      required: ["query"],
    };

    const input = generateValidInput(schema);
    expect(input).toHaveProperty("query");
    expect(typeof input.query).toBe("string");
    // limit is optional, should not be in required-only generation
    expect(input).not.toHaveProperty("limit");
  });

  it("generates edge case inputs", () => {
    const schema = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        age: { type: "number" as const },
      },
      required: ["name"],
    };

    const cases = generateEdgeCaseInputs(schema);
    expect(cases.length).toBeGreaterThan(3);

    // Should include empty object
    const empty = cases.find((c) => c.label === "empty object");
    expect(empty).toBeDefined();

    // Should include missing required
    const missingName = cases.find((c) => c.label === "missing required: name");
    expect(missingName).toBeDefined();
    expect(missingName!.input).not.toHaveProperty("name");

    // Should include wrong type
    const wrongType = cases.find((c) => c.label === "wrong type for: name");
    expect(wrongType).toBeDefined();
    expect(typeof wrongType!.input.name).toBe("number");
  });

  it("handles enum values", () => {
    const schema = {
      type: "object" as const,
      properties: {
        color: { type: "string" as const, enum: ["red", "green", "blue"] },
      },
      required: ["color"],
    };

    const input = generateValidInput(schema);
    expect(input.color).toBe("red");
  });
});
