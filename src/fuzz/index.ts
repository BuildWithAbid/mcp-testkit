import type { McpTestHarness, FuzzOptions, FuzzResult, ToolInfo } from "../types.js";
import { generateEdgeCaseInputs } from "../schema/index.js";

/**
 * Fuzz test a specific tool by generating random and edge-case inputs.
 *
 * ```ts
 * const result = await fuzzTool(harness, "search", {
 *   runs: 100,
 *   assert: (result, input) => {
 *     // Tool should never crash — errors are OK, crashes are not
 *     expect(result.content).toBeDefined();
 *   },
 * });
 * expect(result.failed).toBe(0);
 * ```
 */
export async function fuzzTool(
  harness: McpTestHarness,
  toolName: string,
  options: FuzzOptions = {}
): Promise<FuzzResult> {
  const { runs = 50, assert: assertFn, seed } = options;

  const tools = await harness.listTools();
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool "${toolName}" not found. Available: ${tools.map((t) => t.name).join(", ")}`);
  }

  return runFuzz(harness, tool, runs, assertFn, seed);
}

/**
 * Fuzz test ALL tools on a server.
 */
export async function fuzzAllTools(
  harness: McpTestHarness,
  options: FuzzOptions = {}
): Promise<Map<string, FuzzResult>> {
  const { runs = 50, assert: assertFn, seed } = options;
  const tools = await harness.listTools();
  const results = new Map<string, FuzzResult>();

  for (const tool of tools) {
    results.set(tool.name, await runFuzz(harness, tool, runs, assertFn, seed));
  }

  return results;
}

async function runFuzz(
  harness: McpTestHarness,
  tool: ToolInfo,
  runs: number,
  assertFn?: (result: import("../types.js").ToolResult, input: Record<string, unknown>) => void | Promise<void>,
  seed?: number,
): Promise<FuzzResult> {
  const inputs = generateFuzzInputs(tool, runs, seed);
  const result: FuzzResult = { runs: inputs.length, passed: 0, failed: 0, errors: [] };

  for (const input of inputs) {
    try {
      const toolResult = await harness.callTool(tool.name, input);
      if (assertFn) {
        await assertFn(toolResult, input);
      }
      result.passed++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        input,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

function generateFuzzInputs(
  tool: ToolInfo,
  runs: number,
  seed?: number
): Array<Record<string, unknown>> {
  const inputs: Array<Record<string, unknown>> = [];
  const schema = tool.inputSchema;

  const edgeCases = generateEdgeCaseInputs(schema);
  for (const ec of edgeCases) {
    inputs.push(ec.input);
  }

  const rng = createRng(seed ?? Date.now());
  const props = schema.properties ?? {};
  const propEntries = Object.entries(props);

  while (inputs.length < runs) {
    const input: Record<string, unknown> = {};
    for (const [name, propSchema] of propEntries) {
      input[name] = randomizeValue(propSchema as ToolInfo["inputSchema"], rng);
    }
    inputs.push(input);
  }

  return inputs.slice(0, runs);
}

function randomizeValue(
  schema: ToolInfo["inputSchema"],
  rng: () => number
): unknown {
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[Math.floor(rng() * schema.enum.length)];
  }

  switch (schema.type) {
    case "string": {
      const len = Math.floor(rng() * 100);
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?";
      let result = "";
      for (let i = 0; i < len; i++) {
        result += chars[Math.floor(rng() * chars.length)];
      }
      return result;
    }
    case "number":
      return (rng() - 0.5) * 2_000_000;
    case "integer":
      return Math.floor((rng() - 0.5) * 2_000_000);
    case "boolean":
      return rng() > 0.5;
    case "array":
      return schema.items ? [randomizeValue(schema.items as ToolInfo["inputSchema"], rng)] : [];
    case "object":
      return {};
    default:
      return rng() > 0.5 ? "random" : 42;
  }
}

/** Seeded xorshift32 PRNG for reproducible fuzz runs */
function createRng(seed: number): () => number {
  let state = seed | 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
