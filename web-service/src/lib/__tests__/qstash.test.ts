import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerify = vi.fn();
const mockPublishJSON = vi.fn();

vi.mock("@upstash/qstash", () => {
  class MockSignatureError extends Error {}
  class MockReceiver {
    verify = mockVerify;
  }
  class MockClient {
    publishJSON = mockPublishJSON;
  }

  return {
    Receiver: MockReceiver,
    Client: MockClient,
    SignatureError: MockSignatureError,
  };
});

import { SignatureError } from "@upstash/qstash";
import { enqueueVenueGeneration, verifyQstashRequest } from "../qstash";

describe("qstash helpers", () => {
  const sessionId = "123e4567-e89b-42d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "current-key");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "next-key");
    vi.stubEnv("QSTASH_TOKEN", "qstash-token");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dateflow.test");
  });

  it("returns false when QStash signature verification fails", async () => {
    mockVerify.mockRejectedValueOnce(new SignatureError("invalid signature"));

    const isValid = await verifyQstashRequest(
      new Request("https://dateflow.test/api/sessions/abc/generate", {
        method: "POST",
        headers: {
          "Upstash-Signature": "bad-signature",
        },
        body: JSON.stringify({ sessionId: "abc" }),
      })
    );

    expect(isValid).toBe(false);
  });

  it("publishes the generate job to the session generate endpoint", async () => {
    mockPublishJSON.mockResolvedValueOnce({ messageId: "msg-123" });

    await enqueueVenueGeneration(sessionId);

    expect(mockPublishJSON).toHaveBeenCalledWith({
      url: `https://dateflow.test/api/sessions/${sessionId}/generate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: { sessionId },
    });
  });

  it("rejects non-UUID session ids before publishing", async () => {
    await expect(enqueueVenueGeneration("session-123")).rejects.toThrow(
      "Session ID must be a UUID"
    );

    expect(mockPublishJSON).not.toHaveBeenCalled();
  });
});
