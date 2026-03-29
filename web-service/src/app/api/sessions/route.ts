import { NextResponse } from "next/server";
import { createSession } from "../../../lib/services/session-service";
import { generateShareLink } from "../../../lib/services/share-link-service";
import { serializeSession } from "../../../lib/services/session-serializer";

/**
 * POST /api/sessions
 *
 * Creates a new planning session. Person A sends their display name,
 * receives the session object + a share link to send to Person B.
 */
export async function POST(request: Request) {
  // 1. Parse the request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // 2. Validate required field
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { creatorDisplayName } = body as { creatorDisplayName?: string };

  if (!creatorDisplayName || typeof creatorDisplayName !== "string") {
    return NextResponse.json(
      { error: "creatorDisplayName is required and must be a string" },
      { status: 400 }
    );
  }

  // 3. Create session + generate share link
  try {
    const session = await createSession(creatorDisplayName);
    const shareLink = generateShareLink(session.id, session.expiresAt);

    return NextResponse.json(
      {
        session: serializeSession(session),
        shareLink: {
          url: shareLink.url,
          expiresAt: shareLink.expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const isValidationError =
      message.includes("Display name") ||
      message.includes("characters") ||
      message.includes("HTML");

    if (isValidationError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[POST /api/sessions] Failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
