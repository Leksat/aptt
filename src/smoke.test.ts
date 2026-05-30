import { Effect } from "effect";
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs an Effect", async () => {
    const program = Effect.succeed(42).pipe(Effect.map((n) => n * 2));
    expect(await Effect.runPromise(program)).toBe(84);
  });
});
