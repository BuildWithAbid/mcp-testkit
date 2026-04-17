import "vitest";

declare module "vitest" {
  interface Assertion<T> {
    toHaveToolNamed(name: string): T;
    toHaveToolCount(count: number): T;
    toHaveInputSchema(toolName: string, expectedProps: Record<string, unknown>): T;
    toHaveToolDescription(toolName: string, expected: string | RegExp): T;
    toBeSuccessful(): T;
    toBeToolError(): T;
    toHaveTextContent(expected: string | RegExp): T;
    toHaveContentCount(count: number): T;
    toHaveContentType(type: string): T;
  }

  interface AsymmetricMatchersContaining {
    toHaveToolNamed(name: string): unknown;
    toHaveToolCount(count: number): unknown;
    toHaveInputSchema(toolName: string, expectedProps: Record<string, unknown>): unknown;
    toHaveToolDescription(toolName: string, expected: string | RegExp): unknown;
    toBeSuccessful(): unknown;
    toBeToolError(): unknown;
    toHaveTextContent(expected: string | RegExp): unknown;
    toHaveContentCount(count: number): unknown;
    toHaveContentType(type: string): unknown;
  }
}
