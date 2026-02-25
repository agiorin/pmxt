import { describe, test, expect } from "@jest/globals";
import {
  buildArgsWithOptionalOptions,
  withTrailingOptions,
} from "../pmxt/args";

describe("client args helpers", () => {
  test("buildArgsWithOptionalOptions handles optional options and primary", () => {
    expect(buildArgsWithOptionalOptions(undefined, undefined)).toEqual([]);
    expect(buildArgsWithOptionalOptions({ q: 1 }, undefined)).toEqual([{ q: 1 }]);
    expect(buildArgsWithOptionalOptions(undefined, { mode: "raw" })).toEqual([
      null,
      { mode: "raw" },
    ]);
    expect(buildArgsWithOptionalOptions({ q: 1 }, { mode: "raw" })).toEqual([
      { q: 1 },
      { mode: "raw" },
    ]);
  });

  test("withTrailingOptions pads missing optional args before options", () => {
    expect(withTrailingOptions(["id"], undefined, 2)).toEqual(["id"]);
    expect(withTrailingOptions(["id"], { mode: "raw" }, 2)).toEqual([
      "id",
      null,
      { mode: "raw" },
    ]);
    expect(withTrailingOptions(["id", 10], { mode: "raw" }, 2)).toEqual([
      "id",
      10,
      { mode: "raw" },
    ]);
    expect(withTrailingOptions(["id", 100], { mode: "raw" }, 3)).toEqual([
      "id",
      100,
      null,
      { mode: "raw" },
    ]);
  });
});
