import { Client, Receiver, SignatureError } from "@upstash/qstash";

let qstashClient: Client | null = null;

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

  if (!signature || !currentSigningKey || !nextSigningKey) {
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  const body = await request.text();

  try {
    return await receiver.verify({
      signature,
      body,
      url: request.url,
      upstashRegion: request.headers.get("Upstash-Region") ?? undefined,
    });
  } catch (err) {
    if (err instanceof SignatureError) {
      return false;
    }

    throw err;
  }
}

export async function enqueueVenueGeneration(sessionId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  const client = getQstashClient();

  await client.publishJSON({
    url: `${appUrl}/api/sessions/${sessionId}/generate`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: { sessionId },
  });
}
