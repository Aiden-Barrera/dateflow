import type { Location } from "./types/preference";

type GeocodeResult = {
  readonly lat: number;
  readonly lng: number;
  readonly label: string;
  readonly error?: string;
};

export async function resolveSubmittedLocation(
  location: Location | null,
  locationLabel: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Location> {
  if (location !== null) {
    return location;
  }

  const trimmedLocation = locationLabel.trim();

  if (trimmedLocation.length === 0) {
    throw new Error("Location is required.");
  }

  try {
    const response = await fetchImpl(`/api/geocode?q=${encodeURIComponent(trimmedLocation)}`);
    const data = (await response.json()) as GeocodeResult;

    if (!response.ok || data.error) {
      throw new Error(data.error ?? "Location not found. Try a different city or zip code.");
    }

    return { lat: data.lat, lng: data.lng, label: data.label };
  } catch (error) {
    if (error instanceof Error && error.message.trim().length > 0) {
      const normalized = error.message.toLowerCase();
      if (
        normalized.includes("location not found") ||
        normalized.includes("try a different city or zip code")
      ) {
        throw error;
      }
    }

    throw new Error("Couldn't look up your location. Check your connection and try again.");
  }
}
