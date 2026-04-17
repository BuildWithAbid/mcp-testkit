<div align="center">

# mcp-testkit

### The Testing Framework for MCP Servers

Test your [Model Context Protocol](https://modelcontextprotocol.io) tools, resources, and prompts with
expressive matchers, schema validation, fuzz testing, and snapshot support.

[![npm version](https://img.shields.io/npm/v/mcp-testkit.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/mcp-testkit)
[![CI](https://github.com/BuildWithAbid/mcp-testkit/actions/workflows/ci.yml/badge.svg)](https://github.com/BuildWithAbid/mcp-testkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-18%20%7C%2020%20%7C%20%E2%89%A522-43853d.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

<br />

[Getting Started](#-getting-started) ·
[Features](#-features) ·
[API Reference](#-api-reference) ·
[Contributing](#-contributing)

<br />

</div>

---

<br />

## Why mcp-testkit?

Building MCP servers is straightforward. **Knowing they work correctly is the hard part.**

| Problem | How mcp-testkit solves it |
|:--------|:-------------------------|
| No standard testing patterns | One-line harness setup for any MCP server |
| Boilerplate transport wiring | `createHarness()` handles `InMemoryTransport` or stdio for you |
| Manual `result.content[0].text` checks | Purpose-built matchers like `toBeSuccessful()` and `toHaveTextContent()` |
| No schema validation | `validateToolSchema()` catches issues before production |
| Edge cases found by users, not tests | Built-in fuzz testing with reproducible seeds |

> **Write tests for MCP servers the same way you write tests for REST APIs &mdash; fast, expressive, and reliable.**

<br />

## Table of Contents

- [Getting Started](#-getting-started)
  - [Installation](#installation)
  - [Your First Test](#your-first-test)
  - [Auto-Setup (Optional)](#auto-setup-optional)
- [Features](#-features)
  - [Test Harness](#-test-harness)
  - [Custom Matchers](#-custom-matchers)
  - [Schema Validation](#-schema-validation)
  - [Input Generation](#-input-generation)
  - [Fuzz Testing](#-fuzz-testing)
  - [Snapshot Testing](#-snapshot-testing)
  - [Text Helpers](#-text-helpers)
- [API Reference](#-api-reference)
  - [Harness](#harness)
  - [Matchers](#matchers)
  - [Schema & Validation](#schema--validation)
  - [Fuzz](#fuzz)
  - [Snapshot](#snapshot)
  - [Helpers](#helpers)
- [Compatibility](#-compatibility)
- [Contributing](#-contributing)
- [License](#-license)

<br />

---

<br />

## Getting Started

### Installation

```bash
npm install -D mcp-testkit
```

**Peer dependencies** (you likely already have these):

```bash
npm install @modelcontextprotocol/sdk zod
```

### Your First Test

```typescript
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHarness } from "mcp-testkit";
import { mcpMatchers } from "mcp-testkit/matchers";

expect.extend(mcpMatchers);

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

Skip the `expect.extend()` boilerplate by registering matchers automatically:

```typescript
// vitest.config.ts
export default {
  test: {
    setupFiles: ["mcp-testkit/setup/vitest"],
  },
};
```

<br />

---

<br />

## Features

### Test Harness

Create a fully wired MCP client-server pair in **one line**. No transport setup, no boilerplate.

```typescript
import { createHarness } from "mcp-testkit";

// In-memory harness (unit tests) — pass an McpServer instance
const harness = await createHarness(server);

// Stdio harness (integration tests) — pass a command config
const harness = await createHarness({
  command: "node",
  args: ["./dist/server.js"],
  env: { API_KEY: "test" },
});

// Same API for both modes
const tools = await harness.listTools();
const result = await harness.callTool("my-tool", { input: "test" });
const resources = await harness.listResources();
const prompts = await harness.listPrompts();

await harness.close();
```

<details>
<summary><strong>In-memory vs stdio — when to use which?</strong></summary>

<br />

| | In-memory | Stdio |
|---|---|---|
| **Speed** | Instant | Spawns a child process |
| **Use case** | Unit tests, CI | Integration tests, E2E |
| **Setup** | Pass `McpServer` instance | Pass `{ command, args }` config |
| **Isolation** | Shares process memory | Full process isolation |

Use **in-memory** for fast iteration during development. Use **stdio** to test the actual binary your users will run.

</details>

<br />

### Custom Matchers

Expressive assertions purpose-built for MCP testing. Works with **Vitest** and **Jest**.

#### Tool Discovery

```typescript
expect(tools).toHaveToolNamed("search");
expect(tools).toHaveToolCount(5);
expect(tools).toHaveToolDescription("search", /find items/i);
expect(tools).toHaveInputSchema("search", { query: {}, limit: {} });
```

#### Tool Results

```typescript
expect(result).toBeSuccessful();
expect(result).toBeToolError();
expect(result).toHaveTextContent("expected output");
expect(result).toHaveTextContent(/pattern/);
expect(result).toHaveContentCount(1);
expect(result).toHaveContentType("text");
```

<br />

### Schema Validation

Validate that your tool schemas follow MCP best practices before they reach production.

```typescript
import { validateToolSchema, validateAllToolSchemas } from "mcp-testkit";

const tools = await harness.listTools();

// Validate a single tool
const issues = validateToolSchema(tools[0]);
// [{ path: "properties.query", message: "Missing description", severity: "warning" }]

// Validate all tools at once
const allIssues = validateAllToolSchemas(tools);
// Map<string, SchemaIssue[]>
```

<br />

### Input Generation

Automatically generate valid and edge-case inputs from any tool's JSON Schema.

```typescript
import { generateValidInput, generateEdgeCaseInputs } from "mcp-testkit";

const schema = tools[0].inputSchema;

// Generate a minimal valid input
const input = generateValidInput(schema);
// { query: "test" }

// Generate edge cases for thorough testing
const edgeCases = generateEdgeCaseInputs(schema);
// [
//   { label: "empty object",                      input: {} },
//   { label: "missing required: query",            input: {} },
//   { label: "wrong type for: query",              input: { query: 42 } },
//   { label: "boundary: empty string for query",   input: { query: "" } },
//   { label: "boundary: very long string for query", input: { query: "a".repeat(10000) } },
// ]
```

<br />

### Fuzz Testing

Throw random and adversarial inputs at your tools to surface crashes before your users do.

```typescript
import { fuzzTool, fuzzAllTools } from "mcp-testkit";

// Fuzz a single tool — with a seed for reproducibility
const result = await fuzzTool(harness, "search", {
  runs: 100,
  seed: 42,
  assert: (toolResult) => {
    expect(toolResult.content.length).toBeGreaterThan(0);
  },
});

console.log(`${result.passed}/${result.runs} passed`);
console.log("Failures:", result.errors);

// Fuzz every tool on the server
const results = await fuzzAllTools(harness, { runs: 50, seed: 42 });
```

<br />

### Snapshot Testing

Custom serializer that strips non-deterministic fields for stable, readable snapshots.

```typescript
import { toolResultSerializer } from "mcp-testkit";

expect.addSnapshotSerializer(toolResultSerializer);

const result = await harness.callTool("greet", { name: "World" });
expect(result).toMatchSnapshot();
```

<br />

### Text Helpers

Utility functions for extracting and checking text content in tool results.

```typescript
import { getTexts, getFirstText, hasText } from "mcp-testkit";

const result = await harness.callTool("greet", { name: "World" });

getTexts(result);          // ["Hello, World!"]
getFirstText(result);      // "Hello, World!"
hasText(result, /hello/i); // true
```

<br />

---

<br />

## API Reference

### Harness

| Function | Description |
|:---------|:------------|
| `createHarness(server)` | Create an in-memory test harness from an `McpServer` instance |
| `createHarness(config)` | Create a stdio test harness from `{ command, args?, env?, cwd? }` |

| Method | Returns | Description |
|:-------|:--------|:------------|
| `harness.listTools()` | `ToolInfo[]` | List all registered tools |
| `harness.callTool(name, args?)` | `ToolResult` | Call a tool by name |
| `harness.listResources()` | `ResourceInfo[]` | List all resources |
| `harness.readResource(uri)` | `ResourceResult` | Read a resource by URI |
| `harness.listPrompts()` | `PromptInfo[]` | List all prompts |
| `harness.getPrompt(name, args?)` | `PromptResult` | Get a prompt by name |
| `harness.getServerCapabilities()` | `Record<string, unknown>` | Get server capabilities |
| `harness.close()` | `void` | Close connection and clean up (idempotent) |

### Matchers

| Matcher | Applies to | Description |
|:--------|:-----------|:------------|
| `toHaveToolNamed(name)` | `ToolInfo[]` | Assert a tool with the given name exists |
| `toHaveToolCount(n)` | `ToolInfo[]` | Assert the exact number of tools |
| `toHaveToolDescription(name, expected)` | `ToolInfo[]` | Assert a tool's description matches a string or regex |
| `toHaveInputSchema(name, props)` | `ToolInfo[]` | Assert a tool's schema contains expected properties |
| `toBeSuccessful()` | `ToolResult` | Assert the result has no error flag |
| `toBeToolError()` | `ToolResult` | Assert the result has the error flag |
| `toHaveTextContent(expected)` | `ToolResult` | Assert text content matches a string or regex |
| `toHaveContentCount(n)` | `ToolResult` | Assert the exact number of content items |
| `toHaveContentType(type)` | `ToolResult` | Assert at least one content item has the given type |

### Schema & Validation

| Function | Description |
|:---------|:------------|
| `validateToolSchema(tool)` | Validate a single tool's JSON Schema, returns `SchemaIssue[]` |
| `validateAllToolSchemas(tools)` | Validate all tools, returns `Map<string, SchemaIssue[]>` |
| `validateOutput(output, schema)` | Validate output data against a JSON Schema |
| `generateValidInput(schema)` | Generate a minimal valid input object from a schema |
| `generateEdgeCaseInputs(schema)` | Generate an array of edge-case inputs for boundary testing |

### Fuzz

| Function | Description |
|:---------|:------------|
| `fuzzTool(harness, name, options?)` | Fuzz test a single tool with random inputs |
| `fuzzAllTools(harness, options?)` | Fuzz test every tool on the server |

**`FuzzOptions`**

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `runs` | `number` | `50` | Number of random inputs to generate |
| `seed` | `number` | `Date.now()` | Seed for reproducible runs |
| `assert` | `(result, input) => void` | &mdash; | Custom assertion applied to every result |

### Snapshot

| Export | Description |
|:-------|:------------|
| `toolResultSerializer` | Pre-configured snapshot serializer (strips `_meta`, `_timestamp`, etc.) |
| `createToolResultSerializer(options?)` | Create a custom serializer with your own `stripFields` |

### Helpers

| Function | Description |
|:---------|:------------|
| `getTexts(result)` | Extract all text strings from a `ToolResult` |
| `getFirstText(result)` | Extract the first text string, or `undefined` |
| `hasText(result, pattern)` | Check if any text content matches a string or regex |

<br />

---

<br />

## Compatibility

| Dependency | Supported Versions |
|:-----------|:-------------------|
| **Node.js** | 18, 20, 22+ |
| **Test Runners** | [Vitest](https://vitest.dev), [Jest](https://jestjs.io) |
| **MCP SDK** | [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) v1.12+ |
| **Zod** | [Zod](https://zod.dev) v3.23+ or v4 |
| **TypeScript** | 5.x |

<br />

---

<br />

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/BuildWithAbid/mcp-testkit.git
cd mcp-testkit
npm install
npm test
npm run build
```

<br />

---

<br />

## License

[MIT](LICENSE) &copy; [BuildWithAbid](https://github.com/BuildWithAbid)
