import { Receiver } from "@upstash/qstash";

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

  return receiver.verify({
    signature,
    body,
    url: request.url,
    upstashRegion: request.headers.get("Upstash-Region") ?? undefined,
  });
}
