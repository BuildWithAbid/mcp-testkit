import { expect } from "vitest";
import { mcpMatchers } from "../matchers/index.js";

// Auto-register all custom matchers when this file is imported as a setup file
expect.extend(mcpMatchers);
