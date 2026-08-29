import { describe, expect, it } from "vitest";
import { detectCategory } from "./detect-category";

describe("detectCategory", () => {
  it.each([
    ["linen oversized shirt", "clothing"],
    ["solid oak dining table", "furniture"],
    ["vegan leather tote bag", "accessories"],
    ["matte foundation for oily skin", "makeup"],
    ["organic oat milk", "groceries"],
    ["beginner tennis racket", "sports_equipment"],
  ])("detects %s", (listing, category) => {
    expect(detectCategory(listing)).toBe(category);
  });
});
