import { NextResponse } from "next/server";
import { getAccountByAccessToken } from "../../../../../src/lib/services/account-service";

function getBearerToken(header: string | null): string {
  if (!header) {
    throw new Error("Authorization header is required");
  }

  if (!header.startsWith("Bearer ")) {
    throw new Error("Authorization header must use Bearer token");
  }

  return header.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    const account = await getAccountByAccessToken(token);

    return NextResponse.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (
      message === "Authorization header is required" ||
      message === "Authorization header must use Bearer token" ||
      message === "Invalid token"
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    console.error("[GET /api/auth/me] Failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
