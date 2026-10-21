import { describe, expect, it } from "vitest";

/** Documents uniform 2-column grid successor disagreement (grid subpath deferred). */
describe("grid fixture expectations", () => {
  it("records that row-major successor differs from cell below", () => {
    const rowMajor = ["a", "b", "c", "d"];
    const indexB = rowMajor.indexOf("b");
    expect(rowMajor[indexB + 1]).toBe("c");
    const belowBRowMajorIndex = 3;
    expect(rowMajor[belowBRowMajorIndex]).toBe("d");
    expect(rowMajor[indexB + 1]).not.toBe(rowMajor[belowBRowMajorIndex]);
  });
});
