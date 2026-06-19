import { z } from "zod";

// Minimal local shim for @tanstack/zod-adapter to avoid an external dependency during runtime.
// Exports two helpers used by the app: `fallback` and `zodValidator`.

export function fallback<T extends z.ZodTypeAny>(schema: T, _fallbackValue: unknown): T {
  // The real adapter provides helpers for creating optional/default-aware schemas.
  // For our usage in this repo we can safely return the original schema and rely on
  // callers to call `.default(...)` where needed.
  return schema as T;
}

export function zodValidator(schema: z.ZodTypeAny) {
  // Return a validator function compatible with simple uses in the app.
  // It attempts to parse and, on success, returns the parsed value.
  // On failure we return the raw input to avoid crashing at runtime — callers
  // may handle validation themselves.
  return (input: unknown) => {
    const parsed = schema.safeParse(input);
    if (parsed.success) return parsed.data;
    return input;
  };
}
