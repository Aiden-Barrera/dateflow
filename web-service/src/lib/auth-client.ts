export async function submitAuthRequest(
  endpoint: "/api/auth/register" | "/api/auth/login",
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Something went wrong. Please try again.",
    );
  }

  return payload;
}

export async function beginGoogleLogin(redirectTo: string): Promise<string> {
  const payload = await submitAuthRequest("/api/auth/login", {
    provider: "google",
    redirectTo,
  });

  if (typeof payload.url !== "string") {
    throw new Error("Google sign-in did not return a redirect URL");
  }

  return payload.url;
}

export async function beginAppleLogin(redirectTo: string): Promise<string> {
  const payload = await submitAuthRequest("/api/auth/login", {
    provider: "apple",
    redirectTo,
  });

  if (typeof payload.url !== "string") {
    throw new Error("Apple sign-in did not return a redirect URL");
  }

  return payload.url;
}

export async function fetchCurrentAccount(
  token: string,
): Promise<Record<string, unknown>> {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as {
    account?: Record<string, unknown>;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load account");
  }

  if (!payload.account) {
    throw new Error("Failed to load account");
  }

  return payload.account;
}
