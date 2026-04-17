import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { JsonSchema, SchemaIssue, ToolInfo } from "../types.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

/**
 * Validate that a tool's inputSchema is well-formed JSON Schema.
 */
export function validateToolSchema(tool: ToolInfo): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  if (!tool.inputSchema) {
    issues.push({ path: "inputSchema", message: "Missing inputSchema", severity: "error" });
    return issues;
  }

  if (tool.inputSchema.type !== "object") {
    issues.push({
      path: "inputSchema.type",
      message: `Expected type "object", got "${tool.inputSchema.type}"`,
      severity: "error",
    });
  }

  // Try to compile the schema to check for structural issues
  try {
    ajv.compile(tool.inputSchema);
  } catch (error) {
    issues.push({
      path: "inputSchema",
      message: `Invalid JSON Schema: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
    });
  }

  // Warnings
  if (!tool.description) {
    issues.push({ path: "description", message: "Tool has no description", severity: "warning" });
  }

  const props = tool.inputSchema.properties;
  if (props) {
    for (const [name, prop] of Object.entries(props)) {
      const p = prop as JsonSchema;
      if (!p.description) {
        issues.push({
          path: `inputSchema.properties.${name}.description`,
          message: `Property "${name}" has no description`,
          severity: "warning",
        });
      }
    }
  }

  return issues;
}

/**
 * Validate all tools' schemas and return issues grouped by tool.
 */
export function validateAllToolSchemas(
  tools: ToolInfo[]
): Map<string, SchemaIssue[]> {
  const results = new Map<string, SchemaIssue[]>();
  for (const tool of tools) {
    const issues = validateToolSchema(tool);
    if (issues.length > 0) {
      results.set(tool.name, issues);
    }
  }
  return results;
}

/**
 * Validate that a tool result conforms to the tool's output schema.
 */
export function validateOutput(
  result: unknown,
  outputSchema: JsonSchema
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  try {
    const validate = ajv.compile(outputSchema);
    const valid = validate(result);
    if (!valid && validate.errors) {
      for (const err of validate.errors) {
        issues.push({
          path: err.instancePath || "/",
          message: err.message ?? "Validation error",
          severity: "error",
        });
      }
    }
  } catch (error) {
    issues.push({
      path: "/",
      message: `Schema compilation failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
    });
  }

  return issues;
}

/**
 * Generate a valid input object from a JSON Schema.
 * Uses simple heuristics to produce a minimal valid input.
 */
export function generateValidInput(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  for (const [name, propSchema] of Object.entries(props)) {
    const p = propSchema as JsonSchema;
    // Only generate required fields by default
    if (!required.has(name)) continue;
    result[name] = generateValue(p);
  }

  return result;
}

/**
 * Generate edge-case inputs for negative/boundary testing.
 */
export function generateEdgeCaseInputs(schema: JsonSchema): Array<{
  label: string;
  input: Record<string, unknown>;
}> {
  const cases: Array<{ label: string; input: Record<string, unknown> }> = [];
  const props = schema.properties ?? {};
  const required = schema.required ?? [];

  // Case 1: Empty object
  cases.push({ label: "empty object", input: {} });

  // Case 2: Missing each required field
  for (const reqField of required) {
    const input: Record<string, unknown> = {};
    for (const name of required) {
      if (name !== reqField) {
        const p = props[name] as JsonSchema | undefined;
        if (p) input[name] = generateValue(p);
      }
    }
    cases.push({ label: `missing required: ${reqField}`, input });
  }

  // Case 3: Wrong types for each property
  for (const [name, propSchema] of Object.entries(props)) {
    const p = propSchema as JsonSchema;
    const valid = generateValidInput(schema);
    valid[name] = generateWrongType(p);
    cases.push({ label: `wrong type for: ${name}`, input: valid });
  }

  // Case 4: Boundary values for string/number fields
  for (const [name, propSchema] of Object.entries(props)) {
    const p = propSchema as JsonSchema;
    if (p.type === "string") {
      const valid = generateValidInput(schema);
      valid[name] = "";
      cases.push({ label: `empty string for: ${name}`, input: { ...valid } });
      valid[name] = "x".repeat(10_000);
      cases.push({ label: `very long string for: ${name}`, input: { ...valid } });
    }
    if (p.type === "number" || p.type === "integer") {
      const valid = generateValidInput(schema);
      valid[name] = 0;
      cases.push({ label: `zero for: ${name}`, input: { ...valid } });
      valid[name] = -1;
      cases.push({ label: `negative for: ${name}`, input: { ...valid } });
      valid[name] = Number.MAX_SAFE_INTEGER;
      cases.push({ label: `max int for: ${name}`, input: { ...valid } });
    }
  }

  // Case 5: Extra unknown property
  const validWithExtra = generateValidInput(schema);
  validWithExtra["__unknown_extra_field__"] = "unexpected";
  cases.push({ label: "extra unknown property", input: validWithExtra });

  return cases;
}

function generateValue(schema: JsonSchema): unknown {
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  if (schema.default !== undefined) return schema.default;

  switch (schema.type) {
    case "string":
      if (schema.format === "uri") return "https://example.com";
      if (schema.format === "email") return "test@example.com";
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.pattern) return "test-value";
      return schema.minLength ? "x".repeat(schema.minLength) : "test";
    case "number":
    case "integer":
      return schema.minimum ?? 1;
    case "boolean":
      return true;
    case "array":
      return schema.items ? [generateValue(schema.items)] : [];
    case "object":
      return schema.properties ? generateValidInput(schema) : {};
    case "null":
      return null;
    default:
      return "test";
  }
}

function generateWrongType(schema: JsonSchema): unknown {
  switch (schema.type) {
    case "string": return 12345;
    case "number":
    case "integer": return "not-a-number";
    case "boolean": return "not-a-boolean";
    case "array": return "not-an-array";
    case "object": return "not-an-object";
    default: return null;
  }
}
