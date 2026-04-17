# mcp-testkit

[![npm version](https://img.shields.io/npm/v/mcp-testkit.svg)](https://www.npmjs.com/package/mcp-testkit)
[![CI](https://github.com/BuildWithAbid/mcp-testkit/actions/workflows/ci.yml/badge.svg)](https://github.com/BuildWithAbid/mcp-testkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-18%20%7C%2020%20%7C%20%E2%89%A522-green.svg)](https://nodejs.org)

**The missing testing framework for MCP servers.** Test your [Model Context Protocol](https://modelcontextprotocol.io) tools with custom matchers, schema validation, fuzz testing, and snapshot support.

> Write tests for MCP servers the same way you write tests for REST APIs — fast, expressive, and reliable.

## Why mcp-testkit?

Building MCP servers is easy. Knowing they work correctly is hard:

- **No standard testing patterns** — Every MCP developer writes ad-hoc test setups
- **Boilerplate transport wiring** — Setting up `InMemoryTransport.createLinkedPair()` for every test file
- **No assertion helpers** — Manually checking `result.content[0].text` everywhere
- **No schema validation** — Tools accept anything, crash on bad input in production
- **No fuzz testing** — Edge cases discovered by users, not by your test suite

mcp-testkit solves all of this with a single import.

## Install

```bash
npm install -D mcp-testkit
```

**Peer dependencies** (you likely already have these):
```bash
npm install @modelcontextprotocol/sdk zod
```

## Quick Start

```typescript
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHarness } from "mcp-testkit";
import { mcpMatchers } from "mcp-testkit/matchers";

// Register custom matchers
expect.extend(mcpMatchers);

// Your MCP server
const server = new McpServer({ name: "my-server", version: "1.0.0" });
server.tool(
  "greet",
  "Greet a user",
  { name: z.string() },
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello, ${name}!` }],
  })
);

describe("My MCP Server", () => {
  it("greets users", async () => {
    const harness = await createHarness(server);

    const tools = await harness.listTools();
    expect(tools).toHaveToolNamed("greet");

    const result = await harness.callTool("greet", { name: "World" });
    expect(result).toBeSuccessful();
    expect(result).toHaveTextContent("Hello, World!");

    await harness.close();
  });
});
```

### Auto-Setup (Optional)

Skip `expect.extend()` boilerplate — register matchers automatically:

```typescript
// vitest.config.ts
export default {
  test: {
    setupFiles: ["mcp-testkit/setup/vitest"],
  },
};
```

## Features

### Test Harness

Create a fully wired MCP client-server pair in one line. No transport setup, no boilerplate.

```typescript
import { createHarness } from "mcp-testkit";

// In-memory (unit tests) — pass an McpServer instance
const harness = await createHarness(server);

// Stdio (integration tests) — pass a command config
const harness = await createHarness({
  command: "node",
  args: ["./dist/server.js"],
  env: { API_KEY: "test" },
});

// Use the same API for both
const tools = await harness.listTools();
const result = await harness.callTool("my-tool", { input: "test" });
const resources = await harness.listResources();
const prompts = await harness.listPrompts();
await harness.close();
```

### Custom Matchers

Expressive assertions purpose-built for MCP testing:

```typescript
// Tool discovery
expect(tools).toHaveToolNamed("search");
expect(tools).toHaveToolCount(5);
expect(tools).toHaveToolDescription("search", /find items/i);
expect(tools).toHaveInputSchema("search", { query: {}, limit: {} });

// Tool results
expect(result).toBeSuccessful();
expect(result).toBeToolError();
expect(result).toHaveTextContent("expected output");
expect(result).toHaveTextContent(/pattern/);
expect(result).toHaveContentCount(1);
expect(result).toHaveContentType("text");
```

### Schema Validation

Validate your tool schemas follow MCP best practices:

```typescript
import { validateToolSchema, validateAllToolSchemas } from "mcp-testkit";

const tools = await harness.listTools();

// Validate one tool
const issues = validateToolSchema(tools[0]);
// [{ path: "properties.query", message: "Missing description", severity: "warning" }]

// Validate all tools at once
const allIssues = validateAllToolSchemas(tools);
```

### Input Generation

Generate valid and edge-case inputs from tool schemas:

```typescript
import { generateValidInput, generateEdgeCaseInputs } from "mcp-testkit";

const schema = tools[0].inputSchema;

// Generate minimal valid input
const input = generateValidInput(schema);
// { query: "test" }

// Generate edge cases for thorough testing
const edgeCases = generateEdgeCaseInputs(schema);
// [
//   { label: "empty object", input: {} },
//   { label: "missing required: query", input: {} },
//   { label: "wrong type for: query", input: { query: 42 } },
//   { label: "boundary: empty string for query", input: { query: "" } },
//   { label: "boundary: very long string for query", input: { query: "a".repeat(10000) } },
//   ...
// ]
```

### Fuzz Testing

Throw random inputs at your tools and see what breaks:

```typescript
import { fuzzTool, fuzzAllTools } from "mcp-testkit";

// Fuzz a single tool
const result = await fuzzTool(harness, "search", {
  runs: 100,
  seed: 42, // Reproducible!
  assert: (toolResult) => {
    expect(toolResult.content.length).toBeGreaterThan(0);
  },
});

console.log(`${result.passed}/${result.runs} passed`);
console.log("Failures:", result.failures);

// Fuzz all tools on the server
const results = await fuzzAllTools(harness, { runs: 50, seed: 42 });
```

### Snapshot Testing

Custom serializer that strips non-deterministic fields for stable snapshots:

```typescript
import { toolResultSerializer } from "mcp-testkit";

// Register with vitest
expect.addSnapshotSerializer(toolResultSerializer);

// Now snapshots are deterministic
const result = await harness.callTool("greet", { name: "World" });
expect(result).toMatchSnapshot();
```

### Text Helpers

Utility functions for extracting text from tool results:

```typescript
import { getTexts, getFirstText, hasText } from "mcp-testkit";

const result = await harness.callTool("greet", { name: "World" });

getTexts(result);     // ["Hello, World!"]
getFirstText(result); // "Hello, World!"
hasText(result, /hello/i); // true
```

## API Reference

### Harness

| Function | Description |
|----------|-------------|
| `createHarness(server)` | Create in-memory harness from `McpServer` |
| `createHarness(config)` | Create stdio harness from `{ command, args?, env?, cwd? }` |
| `harness.listTools()` | List all available tools |
| `harness.callTool(name, args?)` | Call a tool and get the result |
| `harness.listResources()` | List all available resources |
| `harness.readResource(uri)` | Read a resource by URI |
| `harness.listPrompts()` | List all available prompts |
| `harness.getPrompt(name, args?)` | Get a prompt by name |
| `harness.close()` | Clean up connections (idempotent) |

### Matchers

| Matcher | Applies to | Description |
|---------|-----------|-------------|
| `toHaveToolNamed(name)` | `ToolInfo[]` | Tool with name exists |
| `toHaveToolCount(n)` | `ToolInfo[]` | Exact number of tools |
| `toHaveToolDescription(name, expected)` | `ToolInfo[]` | Tool description matches string or regex |
| `toHaveInputSchema(name, props)` | `ToolInfo[]` | Tool schema has expected properties |
| `toBeSuccessful()` | `ToolResult` | Result has no error flag |
| `toBeToolError()` | `ToolResult` | Result has error flag |
| `toHaveTextContent(expected)` | `ToolResult` | Text content matches string or regex |
| `toHaveContentCount(n)` | `ToolResult` | Exact number of content items |
| `toHaveContentType(type)` | `ToolResult` | At least one content item of type |

### Schema

| Function | Description |
|----------|-------------|
| `validateToolSchema(tool)` | Validate a tool's JSON Schema |
| `validateAllToolSchemas(tools)` | Validate all tools, returns `Map<name, issues>` |
| `validateOutput(output, schema)` | Validate output against an output schema |
| `generateValidInput(schema)` | Generate minimal valid input |
| `generateEdgeCaseInputs(schema)` | Generate edge case inputs for testing |

### Fuzz

| Function | Description |
|----------|-------------|
| `fuzzTool(harness, name, options?)` | Fuzz test a single tool |
| `fuzzAllTools(harness, options?)` | Fuzz test all tools on the server |

Options: `{ runs?: number, seed?: number, assert?: (result) => void }`

## Works With

- **Test runners**: [Vitest](https://vitest.dev), [Jest](https://jestjs.io)
- **MCP SDK**: [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) v1.12+
- **Schema**: [Zod](https://zod.dev) v3.23+ or v4
- **Node.js**: 18, 20, 22+

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/BuildWithAbid/mcp-testkit.git
cd mcp-testkit
npm install
npm test
npm run build
```

## License

[MIT](LICENSE)
