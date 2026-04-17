import type { SnapshotOptions, ToolResult } from "../types.js";

const DEFAULT_STRIP_FIELDS = ["_meta", "_timestamp", "_requestId", "_progressToken"];

/**
 * Custom snapshot serializer for tool results.
 * Strips non-deterministic fields so snapshots are stable across runs.
 *
 * Usage with vitest:
 * ```ts
 * import { toolResultSerializer } from "mcp-testkit/snapshot";
 * expect.addSnapshotSerializer(toolResultSerializer);
 * ```
 */
export function createToolResultSerializer(options: SnapshotOptions = {}) {
  const stripFields = new Set(options.stripFields ?? DEFAULT_STRIP_FIELDS);

  return {
    test(val: unknown): boolean {
      return (
        typeof val === "object" &&
        val !== null &&
        "content" in val &&
        Array.isArray((val as ToolResult).content)
      );
    },

    serialize(
      val: unknown,
      _config: unknown,
      indentation: string,
    ): string {
      const result = val as ToolResult;
      const cleaned = stripDeep(result, stripFields);
      return indentation + JSON.stringify(cleaned, null, 2).split("\n").join("\n" + indentation);
    },
  };
}

export const toolResultSerializer = createToolResultSerializer();

function stripDeep(obj: unknown, fields: Set<string>): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripDeep(item, fields));
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!fields.has(key)) {
        result[key] = stripDeep(value, fields);
      }
    }
    return result;
  }

  return obj;
}
