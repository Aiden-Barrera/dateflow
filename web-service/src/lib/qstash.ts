import { Client, Receiver, SignatureError } from "@upstash/qstash";

let qstashClient: Client | null = null;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function hasWrappedQuotes(value: string | undefined): boolean {
  return Boolean(value && value.length >= 2 && value.startsWith("\"") && value.endsWith("\""));
}

function getQstashVerificationUrl(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    const requestUrl = new URL(request.url);
    return `${forwardedProto}://${forwardedHost}${requestUrl.pathname}${requestUrl.search}`;
  }

  return request.url;
}

export function getQstashReadiness(): {
  readonly ready: boolean;
  readonly missing: readonly string[];
} {
  const requiredEnv: ReadonlyArray<readonly [string, string | undefined]> = [
    ["QSTASH_TOKEN", process.env.QSTASH_TOKEN],
    ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
  ];
  const missing = requiredEnv.reduce<string[]>((keys, [key, value]) => {
    if (!value) {
      keys.push(key);
    }

    return keys;
  }, []);

  return {
    ready: missing.length === 0,
    missing,
  };
}

function getQstashClient(): Client {
  if (qstashClient) {
    return qstashClient;
  }

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("Missing QSTASH_TOKEN");
  }

  qstashClient = new Client({ token });
  return qstashClient;
}

export async function verifyQstashRequest(request: Request): Promise<boolean> {
  const signature = request.headers.get("Upstash-Signature");
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (!signature || !currentSigningKey || !nextSigningKey) {
    console.warn("[QStash verify] Missing verification inputs", {
      hasSignature: Boolean(signature),
      hasCurrentSigningKey: Boolean(currentSigningKey),
      hasNextSigningKey: Boolean(nextSigningKey),
      currentSigningKeyWrappedInQuotes: hasWrappedQuotes(currentSigningKey),
      nextSigningKeyWrappedInQuotes: hasWrappedQuotes(nextSigningKey),
    });
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  const body = await request.text();
  const verificationUrl =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}${new URL(request.url).pathname}${new URL(request.url).search}`
      : getQstashVerificationUrl(request);

  try {
    return await receiver.verify({
      signature,
      body,
      url: verificationUrl,
      upstashRegion: request.headers.get("Upstash-Region") ?? undefined,
    });
  } catch (err) {
    if (err instanceof SignatureError) {
      console.warn("[QStash verify] Signature verification failed", {
        url: verificationUrl,
        requestUrl: request.url,
        forwardedProto,
        forwardedHost,
        upstashRegion: request.headers.get("Upstash-Region"),
        signaturePrefix: signature.slice(0, 16),
        currentSigningKeyWrappedInQuotes: hasWrappedQuotes(currentSigningKey),
        nextSigningKeyWrappedInQuotes: hasWrappedQuotes(nextSigningKey),
      });
      return false;
    }

    throw err;
  }
}

export async function enqueueVenueGeneration(sessionId: string): Promise<void> {
  if (!isUuid(sessionId)) {
    throw new Error("Session ID must be a UUID");
  }

  const readiness = getQstashReadiness();
  if (!readiness.ready) {
    throw new Error(`Missing ${readiness.missing.join(", ")}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const client = getQstashClient();

  await client.publishJSON({
    url: `${appUrl}/api/sessions/${encodeURIComponent(sessionId)}/generate`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: { sessionId },
  });
}
