import { describe, expect, it } from "vitest";
import type { Gap } from "@/domain/evaluation";
import { selectNextGap } from "./question-priority";

const gaps: Gap[] = [
  {
    featureKey: "weight",
    label: "Weight",
    reason: "missing",
    priority: 90,
    question: "What is the weight?",
    evidenceRequested: true,
  },
  {
    featureKey: "terrain",
    label: "Terrain",
    reason: "missing",
    priority: 70,
    question: "What is the terrain?",
    evidenceRequested: false,
  },
];

describe("selectNextGap", () => {
  it("returns the highest-priority unanswered gap", () => {
    expect(selectNextGap(gaps, [])?.featureKey).toBe("weight");
    expect(selectNextGap(gaps, ["weight"])?.featureKey).toBe("terrain");
    expect(selectNextGap(gaps, ["weight", "terrain"])).toBeNull();
  });
});