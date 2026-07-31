import { it, describe, expect } from "vitest";
import { imagesInSweep, parseTransmissions, sweepForImages } from "./jfUtils";

describe("imagesInSweep", () => {
  it.each([
    [360, 0.1, 3600],
    [90, 0.2, 450],
    [0.1, 0.1, 1],
    [360, 0.05, 7200],
  ])("gives %i deg at %f deg as %i images", (width, increment, expected) => {
    expect(imagesInSweep(width, increment)).toBe(expected);
  });

  it.each([
    // Divides exactly in decimal, but lands just under a whole number in floating point.
    [2.15, 0.05, 43],
    [4.05, 0.05, 81],
    [8.1, 0.05, 162],
  ])(
    "does not lose an image to rounding: %f / %f",
    (width, increment, expected) => {
      expect(imagesInSweep(width, increment)).toBe(expected);
    },
  );

  it.each([
    [10, 0.3, 33],
    [0.5, 0.3, 1],
  ])(
    "rounds a partial last image down: %f / %f",
    (width, increment, expected) => {
      expect(imagesInSweep(width, increment)).toBe(expected);
    },
  );

  it.each([
    [0, 0.1],
    [360, 0],
    [-90, 0.1],
    [90, -0.1],
  ])("reports no images for a nonsense sweep: %f / %f", (width, increment) => {
    expect(imagesInSweep(width, increment)).toBe(0);
  });

  // Matches SingleRotationScan.num_images in mx-bluesky; the two must agree or the box
  // on screen says one thing and the detector is armed for another.
  it("agrees with the plan for the default sweep", () => {
    expect(imagesInSweep(360, 0.1)).toBe(3600);
  });
});

describe("sweepForImages", () => {
  it.each([
    [3600, 0.1, 360],
    [450, 0.2, 90],
    [1, 0.1, 0.1],
  ])("gives %i images at %f deg as %f deg", (images, increment, expected) => {
    expect(sweepForImages(images, increment)).toBe(expected);
  });

  it("does not leave a floating point tail in the range box", () => {
    // 43 * 0.05 is 2.1500000000000004 before trimming.
    expect(sweepForImages(43, 0.05)).toBe(2.15);
  });

  it("round-trips every image count a user might ask for", () => {
    for (const increment of [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1]) {
      for (let images = 1; images <= 3600; images++) {
        expect(
          imagesInSweep(sweepForImages(images, increment), increment),
        ).toBe(images);
      }
    }
  });
});

describe("parseTransmissions", () => {
  it.each([
    ["0.5", [0.5]],
    ["0.3, 0.5", [0.3, 0.5]],
    ["  0.3 ,0.5 , 0.7 ", [0.3, 0.5, 0.7]],
    // The bounds are inclusive, matching the validator on the plan's params.
    ["0", [0]],
    ["1", [1]],
  ])("reads %s as %j", (entered, expected) => {
    expect(parseTransmissions(entered).values).toEqual(expected);
  });

  it.each(["1.5", "-0.1", "0.5, 2", "100"])(
    "rejects a value outside 0 to 1: %s",
    (entered) => {
      const parsed = parseTransmissions(entered);
      expect(parsed.values).toBeUndefined();
      expect(parsed.error).toMatch(/between 0 and 1/);
    },
  );

  it.each(["", "   ", ","])("rejects an empty entry: %s", (entered) => {
    expect(parseTransmissions(entered).error).toBeDefined();
  });

  it.each(["half", "0.3, abc"])("rejects a non-number: %s", (entered) => {
    const parsed = parseTransmissions(entered);
    expect(parsed.values).toBeUndefined();
    expect(parsed.error).toMatch(/not a number/);
  });

  it("names the offending value so it can be found in a list", () => {
    expect(parseTransmissions("0.3, 4, 0.5").error).toContain("4");
  });
});
