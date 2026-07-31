export function fullStorageDirectory(currentVisit: string): string {
  return `${currentVisit}jungfrau/`;
}

/** How many images the rotation plan will collect for a given sweep.
 *
 * Mirrors SingleRotationScan.num_images in mx-bluesky, tolerance included, so the box on
 * screen says what the detector will actually be armed for. Both use IEEE doubles, so
 * the two agree exactly.
 */
export function imagesInSweep(
  scanWidthDeg: number,
  incrementDeg: number,
): number {
  if (!(incrementDeg > 0) || !(scanWidthDeg > 0)) {
    return 0;
  }
  const quotient = scanWidthDeg / incrementDeg;
  const nearest = Math.round(quotient);
  // A sweep that divides exactly can still land a hair under a whole number: 2.15 / 0.05
  // is 42.99999999999999, and truncating that silently drops an image.
  return Math.abs(quotient - nearest) <= 1e-9 * Math.abs(quotient)
    ? nearest
    : Math.floor(quotient);
}

/** The sweep needed to collect a requested number of images at a given increment. */
export function sweepForImages(images: number, incrementDeg: number): number {
  if (!(incrementDeg > 0) || !(images > 0)) {
    return 0;
  }
  return trimFloatNoise(images * incrementDeg);
}

/** What the transmission box currently holds: usable values, or why they are not. */
export type ParsedTransmissions =
  | { values: number[]; error?: undefined }
  | { values?: undefined; error: string };

/** Read the transmission box: one fraction, or several separated by commas.
 *
 * The bounds match the validator on ExternalRotationScanParams, which rejects anything
 * outside 0 to 1. Catching it here makes it a message next to the box rather than a 422
 * from blueapi after the plan has been submitted.
 */
export function parseTransmissions(entered: string): ParsedTransmissions {
  const parts = entered
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

  if (parts.length === 0) {
    return { error: "Enter a transmission between 0 and 1" };
  }

  const values: number[] = [];
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isFinite(value)) {
      return { error: `"${part}" is not a number` };
    }
    if (value < 0 || value > 1) {
      return {
        error: `Transmission is a fraction: ${part} is not between 0 and 1`,
      };
    }
    values.push(value);
  }
  return { values };
}

/** Drop the floating point tail from a computed value, so a box reads 2.15 not 2.1500000000000004. */
export function trimFloatNoise(value: number): number {
  return Number(value.toPrecision(12));
}

export function getCurrentVisit(instrumentSession: string): string {
  const date = new Date();
  const year = date.getFullYear();
  return `/dls/i24/data/${year}/${instrumentSession}/`;
}
