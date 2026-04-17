import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  McpTestHarness,
  ToolInfo,
  ToolResult,
  ResourceInfo,
  ResourceResult,
  PromptInfo,
  PromptResult,
} from "../types.js";

/**
 * Wraps a connected MCP Client into a McpTestHarness with a clean API.
 */
export function wrapClient(
  client: Client,
  cleanup: () => Promise<void>
): McpTestHarness {
  let closed = false;

  return {
    client,

    async listTools(): Promise<ToolInfo[]> {
      const result = await client.listTools();
      return (result.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as ToolInfo["inputSchema"],
        outputSchema: (t as Record<string, unknown>).outputSchema as ToolInfo["outputSchema"],
        annotations: t.annotations as ToolInfo["annotations"],
      }));
    },

    async callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult> {
      const result = await client.callTool({ name, arguments: args });
      return {
        content: (result.content ?? []) as ToolResult["content"],
        isError: (result.isError as boolean | undefined) ?? false,
        structuredContent: (result as Record<string, unknown>).structuredContent,
      };
    },

    async listResources(): Promise<ResourceInfo[]> {
      const result = await client.listResources();
      return (result.resources ?? []).map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
    },

    async readResource(uri: string): Promise<ResourceResult> {
      const result = await client.readResource({ uri });
      return { contents: result.contents as ResourceResult["contents"] };
    },

    async listPrompts(): Promise<PromptInfo[]> {
      const result = await client.listPrompts();
      return (result.prompts ?? []).map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments?.map((a) => ({
          name: a.name,
          description: a.description,
          required: a.required,
        })),
      }));
    },

    async getPrompt(name: string, args?: Record<string, string>): Promise<PromptResult> {
      const result = await client.getPrompt({ name, arguments: args });
      return {
        description: result.description,
        messages: result.messages.map((m) => ({
          role: m.role,
          content: m.content as PromptResult["messages"][0]["content"],
        })),
      };
    },

    async getServerCapabilities(): Promise<Record<string, unknown>> {
      return (client.getServerCapabilities() ?? {}) as Record<string, unknown>;
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await cleanup();
    },
  };
}
