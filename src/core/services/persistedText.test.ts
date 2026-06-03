import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makePersistedText } from "./persistedText";

const makeBackingStore = (initial = "") => {
  let stored = initial;
  return {
    read: Effect.sync(() => stored),
    write: (text: string) =>
      Effect.sync(() => {
        stored = text;
      }),
    current: () => stored,
  };
};

describe("makePersistedText", () => {
  it("loads the initial text from the read effect", async () => {
    const backing = makeBackingStore("2026-01-01 10:00\nABC-1 hello\n");
    const text = await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* makePersistedText({ read: backing.read, write: backing.write });
        return store.snapshot();
      }),
    );
    expect(text).toBe("2026-01-01 10:00\nABC-1 hello\n");
  });

  it("propagates whatever the read yields, including the empty string", async () => {
    const backing = makeBackingStore();
    const text = await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* makePersistedText({ read: backing.read, write: backing.write });
        return store.snapshot();
      }),
    );
    expect(text).toBe("");
  });

  it("setText updates the snapshot, writes to the backing store, and notifies subscribers", async () => {
    const backing = makeBackingStore();
    const notifications: string[] = [];
    await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* makePersistedText({ read: backing.read, write: backing.write });
        store.subscribe(() => notifications.push(store.snapshot()));
        yield* store.setText("hello");
      }),
    );
    expect(notifications).toEqual(["hello"]);
    expect(backing.current()).toBe("hello");
  });

  it("setText with the current value does not notify subscribers", async () => {
    const backing = makeBackingStore("same");
    const notifications: string[] = [];
    await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* makePersistedText({ read: backing.read, write: backing.write });
        store.subscribe(() => notifications.push(store.snapshot()));
        yield* store.setText("same");
      }),
    );
    expect(notifications).toEqual([]);
    expect(backing.current()).toBe("same");
  });

  it("unsubscribe stops further notifications", async () => {
    const backing = makeBackingStore();
    const notifications: string[] = [];
    await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* makePersistedText({ read: backing.read, write: backing.write });
        const unsubscribe = store.subscribe(() => notifications.push(store.snapshot()));
        yield* store.setText("first");
        unsubscribe();
        yield* store.setText("second");
      }),
    );
    expect(notifications).toEqual(["first"]);
    expect(backing.current()).toBe("second");
  });
});
