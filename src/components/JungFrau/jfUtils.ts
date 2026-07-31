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

/** Drop the floating point tail from a computed value, so a box reads 2.15 not 2.1500000000000004. */
export function trimFloatNoise(value: number): number {
  return Number(value.toPrecision(12));
}

export function getCurrentVisit(instrumentSession: string): string {
  const date = new Date();
  const year = date.getFullYear();
  return `/dls/i24/data/${year}/${instrumentSession}/`;
}
