import { NextResponse } from "next/server";
import {
  beginAppleOAuth,
  beginGoogleOAuth,
  login,
} from "../../../../lib/services/account-service";

type LoginBody = {
  email?: unknown;
  password?: unknown;
  provider?: unknown;
  redirectTo?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: LoginBody): { email: string; password: string } {
  if (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email)) {
    throw new Error("email must be a valid email address");
  }

  if (typeof body.password !== "string") {
    throw new Error("password is required and must be a string");
  }

  return {
    email: body.email,
    password: body.password,
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
    const typedBody = body as LoginBody;

    if (typedBody.provider === "google") {
      const url = await beginGoogleOAuth(
        typeof typedBody.redirectTo === "string" ? typedBody.redirectTo : undefined,
      );
      return NextResponse.json({ url });
    }

    if (typedBody.provider === "apple") {
      const url = await beginAppleOAuth(
        typeof typedBody.redirectTo === "string" ? typedBody.redirectTo : undefined,
      );
      return NextResponse.json({ url });
    }

    const { email, password } = validate(typedBody);
    const result = await login(email, password);

    return NextResponse.json({
      account: {
        id: result.account.id,
        email: result.account.email,
        createdAt: result.account.createdAt.toISOString(),
      },
      token: result.token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (
      message === "email must be a valid email address" ||
      message === "password is required and must be a string"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message === "Invalid credentials") {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    console.error("[POST /api/auth/login] Failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
