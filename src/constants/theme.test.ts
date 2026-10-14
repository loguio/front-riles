import { describe, expect, it } from "vitest";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "./theme";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

describe("Colors", () => {
  it("uses the orange primary brand color everywhere it matters", () => {
    expect(Colors.primary).toBe("#FF5722");
    expect(Colors.primaryDark).toBe("#E64A19");
    expect(Colors.primaryLight).toBe("#FF8A65");
    expect(Shadows.heroAccent.shadowColor).toBe(Colors.primary);
  });

  it("only contains valid hex color values", () => {
    const invalid = Object.entries(Colors).filter(
      ([, value]) => typeof value !== "string" || !HEX.test(value),
    );
    expect(invalid).toEqual([]);
  });

  it("defines five distinct heart-rate zone colors", () => {
    const zones = [
      Colors.zone1,
      Colors.zone2,
      Colors.zone3,
      Colors.zone4,
      Colors.zone5,
    ];
    expect(zones).toHaveLength(5);
    zones.forEach((zone) => expect(zone).toMatch(HEX));
    expect(new Set(zones).size).toBe(5);
  });
});

describe("Spacing / BorderRadius", () => {
  it("uses a monotonic 4px spacing scale", () => {
    const values = Object.values(Spacing);
    expect(values[0]).toBe(4);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it("keeps rounded corners increasing up to the pill radius", () => {
    expect(BorderRadius.sm).toBe(8);
    expect(BorderRadius.full).toBe(9999);
    expect(BorderRadius.lg).toBeGreaterThan(BorderRadius.sm);
  });
});

describe("Typography / Shadows", () => {
  it("exposes a system font stack and a growing type scale", () => {
    expect(Typography.fontFamilies.regular).toBe("System");
    const sizes = Object.values(Typography.sizes);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(Typography.sizes.display).toBeGreaterThan(Typography.sizes.xs);
  });

  it("gives the hero accent the strongest elevation", () => {
    const elevations = Object.values(Shadows).map((shadow) => shadow.elevation);
    expect(Shadows.heroAccent.elevation).toBe(Math.max(...elevations));
    expect(Shadows.card.elevation).toBeGreaterThan(0);
  });
});
