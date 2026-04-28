import { NextResponse } from "next/server";

type RateLimitOptions = {
  readonly key: string;
  readonly limit: number;
  readonly windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip");
}

export function checkRateLimit(
  request: Request,
  { key, limit, windowMs }: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const clientIp = getClientIp(request);
  if (!clientIp && process.env.NODE_ENV === "test") {
    return null;
  }

  const storeKey = `${key}:${clientIp ?? "unknown"}`;
  const current = store.get(storeKey);

  if (!current || current.resetAt <= now) {
    store.set(storeKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  current.count += 1;
  store.set(storeKey, current);
  return null;
}

export function resetRateLimitStoreForTests(): void {
  store.clear();
}
