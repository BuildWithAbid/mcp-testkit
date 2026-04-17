import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

/** Options for creating a test harness */
export interface HarnessOptions {
  /** Client name sent during initialization */
  clientName?: string;
  /** Client version sent during initialization */
  clientVersion?: string;
}

/** Options for stdio-based harness */
export interface StdioHarnessConfig {
  /** Command to spawn (e.g., "node") */
  command: string;
  /** Arguments for the command (e.g., ["./dist/server.js"]) */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
}

/** A connected test harness wrapping an MCP client */
export interface McpTestHarness {
  /** The underlying MCP Client */
  client: Client;

  /** List all tools registered on the server */
  listTools(): Promise<ToolInfo[]>;

  /** Call a tool by name with optional arguments */
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;

  /** List all resources */
  listResources(): Promise<ResourceInfo[]>;

  /** Read a resource by URI */
  readResource(uri: string): Promise<ResourceResult>;

  /** List all prompts */
  listPrompts(): Promise<PromptInfo[]>;

  /** Get a prompt by name with optional arguments */
  getPrompt(name: string, args?: Record<string, string>): Promise<PromptResult>;

  /** Get server capabilities */
  getServerCapabilities(): Promise<Record<string, unknown>>;

  /** Close the connection and clean up */
  close(): Promise<void>;
}

/** Tool info returned from listTools */
export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: Record<string, unknown>;
}

/** Result from calling a tool */
export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
  structuredContent?: unknown;
}

/** A single content item in a tool result */
export interface ToolContent {
  type: "text" | "image" | "resource" | "audio" | (string & {});
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  [key: string]: unknown;
}

/** JSON Schema type */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

/** Resource info from listResources */
export interface ResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** Result from reading a resource */
export interface ResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

/** Prompt info from listPrompts */
export interface PromptInfo {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/** Result from getPrompt */
export interface PromptResult {
  description?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: string;
      text?: string;
      [key: string]: unknown;
    };
  }>;
}

/** Options for fuzz testing */
export interface FuzzOptions {
  /** Number of random inputs to generate (default: 50) */
  runs?: number;
  /** Assertion function that must hold for all inputs */
  assert?: (result: ToolResult, input: Record<string, unknown>) => void | Promise<void>;
  /** Seed for reproducible fuzz runs */
  seed?: number;
}

/** Schema validation issue */
export interface SchemaIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

/** Fuzz result summary */
export interface FuzzResult {
  runs: number;
  passed: number;
  failed: number;
  errors: Array<{
    input: Record<string, unknown>;
    error: string;
  }>;
}

/** Snapshot serializer options */
export interface SnapshotOptions {
  /** Fields to strip from snapshots (default: ["_meta", "_timestamp", "_requestId", "_progressToken"]) */
  stripFields?: string[];
}
