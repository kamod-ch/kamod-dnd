import { describe, expect, it } from "vitest";

describe("SSR import", () => {
  it("loads package entry without window usage at import time", async () => {
    const mod = await import("../src/index.js");
    expect(mod.DndProvider).toBeTypeOf("function");
    const sortable = await import("../src/sortable/index.js");
    expect(sortable.useSortable).toBeTypeOf("function");
  });
});
