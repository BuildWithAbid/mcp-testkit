import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "matchers/index": "src/matchers/index.ts",
    "setup/vitest": "src/setup/vitest.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    "@modelcontextprotocol/sdk",
    "zod",
    "vitest",
    "jest",
  ],
});
