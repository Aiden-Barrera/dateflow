import type { Location } from "../types/preference";

/**
 * Earth's radius in meters. Used by the Haversine formula.
 * We use the mean radius (6,371 km) — accurate enough for city-scale distances.
 */
const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates the geographic midpoint between two locations.
 *
 * Uses a spherical midpoint formula (not simple averaging) so the result
 * is accurate even when locations are far apart. For nearby city-scale
 * points the difference is negligible, but correctness costs nothing here.
 *
 * The returned Location has label "Midpoint" — it's a computed point,
 * not a real place.
 */
export function calculateMidpoint(a: Location, b: Location): Location {
  const lat1 = toRadians(a.lat);
  const lng1 = toRadians(a.lng);
  const lat2 = toRadians(b.lat);
  const lng2 = toRadians(b.lng);

  // Convert both points to Cartesian coordinates on a unit sphere,
  // average the vectors, then convert back to lat/lng.
  const x = (Math.cos(lat1) * Math.cos(lng1) + Math.cos(lat2) * Math.cos(lng2)) / 2;
  const y = (Math.cos(lat1) * Math.sin(lng1) + Math.cos(lat2) * Math.sin(lng2)) / 2;
  const z = (Math.sin(lat1) + Math.sin(lat2)) / 2;

  const midLat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const midLng = Math.atan2(y, x);

  return {
    lat: toDegrees(midLat),
    lng: toDegrees(midLng),
    label: "Midpoint",
  };
}

/**
 * Calculates the distance in meters between two locations using the
 * Haversine formula.
 *
 * Returns 0 for identical points (no floating-point weirdness).
 */
export function distanceBetween(a: Location, b: Location): number {
  if (a.lat === b.lat && a.lng === b.lng) {
    return 0;
  }

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(h));
}
