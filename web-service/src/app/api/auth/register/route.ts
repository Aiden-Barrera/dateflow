import { NextResponse } from "next/server";
import { register } from "../../../../lib/services/account-service";
import { linkSessionToAccount } from "../../../../lib/services/session-history-service";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  linkSessionId?: unknown;
  linkRole?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: RegisterBody): {
  email: string;
  password: string;
  linkSessionId: string | null;
  linkRole: "a" | "b" | null;
} {
  if (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email)) {
    throw new Error("email must be a valid email address");
  }

  if (typeof body.password !== "string" || body.password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }

  if (
    typeof body.linkSessionId === "string" &&
    body.linkSessionId.length > 0 &&
    body.linkRole !== "a" &&
    body.linkRole !== "b"
  ) {
    throw new Error("linkRole is required when linkSessionId is provided");
  }

  return {
    email: body.email,
    password: body.password,
    linkSessionId:
      typeof body.linkSessionId === "string" && body.linkSessionId.length > 0
        ? body.linkSessionId
        : null,
    linkRole: body.linkRole === "a" || body.linkRole === "b" ? body.linkRole : null,
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }

  try {
    const { email, password, linkSessionId, linkRole } = validate(
      body as RegisterBody,
    );
    const result = await register(email, password);
    const responseBody = {
      account: {
        id: result.account.id,
        email: result.account.email,
        createdAt: result.account.createdAt.toISOString(),
      },
      token: result.token,
    };

    if (linkSessionId && linkRole) {
      try {
        await linkSessionToAccount(linkSessionId, result.account.id, linkRole);
      } catch (linkErr) {
        console.error(
          "[POST /api/auth/register] Session link failed after successful registration:",
          linkErr,
        );
        return NextResponse.json(
          {
            ...responseBody,
            warning: "Account created, but we could not link the provided session.",
          },
          { status: 201 },
        );
      }
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (
      message === "email must be a valid email address" ||
      message === "password must be at least 8 characters" ||
      message === "linkRole is required when linkSessionId is provided"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message === "Email already registered") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (message === "Check your email to confirm your account") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[POST /api/auth/register] Failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
