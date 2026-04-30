import { recordPlacesPhotoUsage } from "../../../../lib/services/unit-economics-service";

const GOOGLE_PLACES_PHOTO_BASE_URL = "https://places.googleapis.com/v1";
const DEFAULT_MAX_HEIGHT_PX = 1200;
const MAX_ALLOWED_HEIGHT_PX = 4800;
const PLACE_PHOTO_NAME_PATTERN = /^places\/[^/?#]+\/photos\/[^/?#]+$/;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAN_SESSION_PATH_PATTERN = /^\/plan\/([0-9a-f-]{36})(?:\/|$)/i;

function parsePhotoName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return PLACE_PHOTO_NAME_PATTERN.test(value) ? value : null;
}

function parseMaxHeightPx(value: string | null): number {
  if (!value) {
    return DEFAULT_MAX_HEIGHT_PX;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_HEIGHT_PX;
  }

  return Math.min(parsed, MAX_ALLOWED_HEIGHT_PX);
}

function parseSessionId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return SESSION_ID_PATTERN.test(value) ? value : null;
}

function parseSessionIdFromReferer(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const referer = new URL(value);
    const match = referer.pathname.match(PLAN_SESSION_PATH_PATTERN);
    return parseSessionId(match?.[1] ?? null);
  } catch {
    return null;
  }
}

function resolveSessionId(request: Request, searchParams: URLSearchParams): string | null {
  return (
    parseSessionId(searchParams.get("sessionId")) ??
    parseSessionIdFromReferer(request.headers.get("referer"))
  );
}

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response("Photo service is not configured", { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const photoName = parsePhotoName(searchParams.get("name"));
  if (!photoName) {
    return new Response("Photo name is required", { status: 400 });
  }

  const maxHeightPx = parseMaxHeightPx(searchParams.get("maxHeightPx"));
  const sessionId = resolveSessionId(request, searchParams);
  const photoUrl =
    `${GOOGLE_PLACES_PHOTO_BASE_URL}/${photoName}/media?maxHeightPx=${maxHeightPx}`;

  const upstream = await fetch(photoUrl, {
    headers: {
      "X-Goog-Api-Key": apiKey,
    },
  });

  if (!upstream.ok) {
    if (upstream.status === 404) {
      return new Response("Photo not found", { status: 404 });
    }

    return new Response("Failed to load photo", { status: 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");

  if (sessionId) {
    recordPlacesPhotoUsage(sessionId, 1).catch((error) => {
      console.error("[GET /api/places/photos] Failed to record photo usage:", error);
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
