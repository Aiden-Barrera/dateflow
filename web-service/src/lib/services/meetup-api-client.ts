import type { Location } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";

const MEETUP_GQL_URL = "https://api.meetup.com/gql";

const NEARBY_EVENTS_QUERY = `
  query NearbyEvents($lat: Float!, $lon: Float!, $radius: Float!, $first: Int!) {
    keywordSearch(
      filter: {
        lat: $lat
        lon: $lon
        radius: $radius
        source: EVENTS
        query: ""
      }
      first: $first
    ) {
      edges {
        node {
          id
          title
          dateTime
          endTime
          eventUrl
          description
          going
          venue {
            name
            address
            lat
            lng
          }
        }
      }
    }
  }
`;

type MeetupVenue = {
  readonly name: string;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
};

type MeetupEvent = {
  readonly id: string;
  readonly title: string;
  readonly dateTime: string;
  readonly endTime?: string | null;
  readonly eventUrl: string;
  readonly description?: string | null;
  readonly going?: number | null;
  readonly venue?: MeetupVenue | null;
};

type MeetupGqlResponse = {
  readonly data?: {
    readonly keywordSearch?: {
      readonly edges?: ReadonlyArray<{ readonly node: MeetupEvent }>;
    };
  };
};

function parseDurationMinutes(
  startIso: string,
  endIso: string | null | undefined,
): number | undefined {
  if (!endIso) return undefined;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return undefined;
  return Math.round((end - start) / 60_000);
}

function toPlaceCandidate(event: MeetupEvent): PlaceCandidate | null {
  if (!event.venue) return null;

  const { venue } = event;
  const scheduledAt = new Date(event.dateTime);
  const durationMinutes = parseDurationMinutes(event.dateTime, event.endTime);

  return {
    placeId: `meetup:${event.id}`,
    name: event.title,
    address: venue.address,
    location: {
      lat: venue.lat,
      lng: venue.lng,
      label: venue.name,
    },
    types: ["event"],
    primaryType: "event",
    priceLevel: 0,
    rating: 0,
    reviewCount: 0,
    sourceType: "meetup",
    scheduledAt,
    eventUrl: event.eventUrl,
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(event.description ? { eventDescription: event.description } : {}),
    ...(typeof event.going === "number" ? { attendanceSignal: event.going } : {}),
  };
}

/**
 * Fetches nearby events from Meetup's GraphQL API.
 *
 * @param location  Center point to search from
 * @param radiusMeters  Search radius in meters (converted to km for Meetup)
 * @returns  Array of PlaceCandidate objects, or empty array on failure
 */
export async function fetchMeetupEventCandidates(
  location: Location,
  radiusMeters: number,
): Promise<readonly PlaceCandidate[]> {
  const apiKey = process.env.MEETUP_API_KEY;

  if (!apiKey) {
    console.warn("[fetchMeetupEventCandidates] MEETUP_API_KEY not set — skipping");
    return [];
  }

  const radiusKm = radiusMeters / 1000;

  try {
    const response = await fetch(MEETUP_GQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: NEARBY_EVENTS_QUERY,
        variables: {
          lat: location.lat,
          lon: location.lng,
          radius: radiusKm,
          first: 20,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Meetup API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as MeetupGqlResponse;
    const edges = data.data?.keywordSearch?.edges ?? [];

    const candidates = edges
      .map((edge) => toPlaceCandidate(edge.node))
      .filter((candidate): candidate is PlaceCandidate => candidate !== null);

    return candidates;
  } catch (err) {
    console.error("[fetchMeetupEventCandidates] failed", err);
    return [];
  }
}
