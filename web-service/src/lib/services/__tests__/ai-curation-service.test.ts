import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDeterministicRanking,
  getAiCurationConfig,
  parseAiVenueAdjustments,
  mergeAiAdjustments,
  scoreAndCurate,
  trimFinalistsForAi,
} from "../ai-curation-service";
import type { PlaceCandidate } from "../../types/venue";
import type { Preference } from "../../types/preference";
import type { Location } from "../../types/preference";

const midpoint: Location = {
  lat: 30.2672,
  lng: -97.7431,
  label: "Midpoint",
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockConsoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

const preferences: readonly [Preference, Preference] = [
  {
    id: "pref-a",
    sessionId: "session-1",
    role: "a",
    location: { lat: 30.28, lng: -97.74, label: "North Austin" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "BAR"],
    createdAt: new Date("2026-04-01T10:00:00Z"),
  },
  {
    id: "pref-b",
    sessionId: "session-1",
    role: "b",
    location: { lat: 30.25, lng: -97.75, label: "South Austin" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "ACTIVITY"],
    createdAt: new Date("2026-04-01T10:01:00Z"),
  },
];

function makeCandidate(
  placeId: string,
  overrides: Partial<PlaceCandidate> = {}
): PlaceCandidate {
  return {
    placeId,
    name: `Venue ${placeId}`,
    address: "123 Main St, Austin, TX",
    location: midpoint,
    types: ["restaurant"],
    priceLevel: 2,
    rating: 4.5,
    reviewCount: 300,
    photoReference: null,
    ...overrides,
  };
}

describe("scoreAndCurate", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("AI_CURATION_ENABLED", "");
    vi.stubEnv("AI_CURATION_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    mockFetch.mockReset();
    mockConsoleInfo.mockClear();
    mockConsoleWarn.mockClear();
  });

  it("falls back to deterministic ranking when Gemini is unavailable", async () => {
    const candidates = [
      makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
      makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
    ];

    const result = await scoreAndCurate(candidates, preferences, 1, midpoint);

    expect(result).toHaveLength(2);
    expect(result[0].placeId).toBe("top-choice");
    expect(result[0].tags).toContain("unscored");
    expect(result[0].score.composite).toBeGreaterThan(result[1].score.composite);
  });

  it("boosts activity-style venues in round 2 fallback scoring", async () => {
    const candidates = [
      makeCandidate("restaurant", {
        types: ["restaurant"],
        rating: 4.5,
        reviewCount: 300,
      }),
      makeCandidate("activity", {
        types: ["bowling_alley"],
        rating: 4.4,
        reviewCount: 280,
      }),
    ];

    const result = await scoreAndCurate(candidates, preferences, 2, midpoint);

    expect(result[0].placeId).toBe("activity");
    expect(result[0].score.timeOfDayFit).toBeGreaterThan(
      result[1].score.timeOfDayFit
    );
  });

  it("extracts deterministic finalists and only lets AI touch allowed fields", async () => {
    const deterministic = buildDeterministicRanking(
      [
        makeCandidate("top-choice", { rating: 4.9, reviewCount: 700 }),
        makeCandidate("middle-choice", { rating: 4.4, reviewCount: 250 }),
        makeCandidate("last-choice", { rating: 3.7, reviewCount: 40 }),
      ],
      preferences,
      1,
      midpoint,
    );

    const finalists = trimFinalistsForAi(deterministic, 2);
    const merged = mergeAiAdjustments(deterministic, [
      {
        placeId: "middle-choice",
        firstDateSuitability: 0.97,
        tags: ["cozy", "easy conversation"],
        rerankAdjustment: 0.08,
      },
    ]);

    expect(finalists).toHaveLength(2);
    expect(finalists[0].placeId).toBe("top-choice");
    expect(finalists[1].placeId).toBe("middle-choice");

    const middle = merged.find((candidate) => candidate.placeId === "middle-choice");
    const last = merged.find((candidate) => candidate.placeId === "last-choice");

    expect(middle?.score.firstDateSuitability).toBe(0.97);
    expect(middle?.tags).toEqual(["cozy", "easy conversation"]);
    expect(middle?.score.categoryOverlap).toBe(
      deterministic.find((candidate) => candidate.placeId === "middle-choice")?.score.categoryOverlap,
    );
    expect(last?.tags).toContain("unscored");
  });

  it("keeps deterministic ranking when AI is disabled or the provider is unsupported", async () => {
    const candidates = [
      makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
      makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
    ];

    vi.stubEnv("AI_CURATION_ENABLED", "false");
    vi.stubEnv("GEMINI_API_KEY", "test-key");

    const disabledResult = await scoreAndCurate(candidates, preferences, 1, midpoint);

    vi.stubEnv("AI_CURATION_ENABLED", "true");
    vi.stubEnv("AI_CURATION_PROVIDER", "openai");

    const unsupportedProviderResult = await scoreAndCurate(
      candidates,
      preferences,
      1,
      midpoint,
    );

    expect(disabledResult[0].tags).toContain("unscored");
    expect(unsupportedProviderResult[0].tags).toContain("unscored");
    expect(getAiCurationConfig()).toEqual({
      enabled: true,
      provider: "openai",
      promptVersion: "v1",
    });
  });

  it("validates the constrained AI adjustment payload shape", () => {
    const finalists = trimFinalistsForAi(
      buildDeterministicRanking(
        [
          makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
          makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
        ],
        preferences,
        1,
        midpoint,
      ),
      2,
    );

    expect(
      parseAiVenueAdjustments(
        {
          venues: [
            {
              placeId: "top-choice",
              firstDateSuitability: 0.91,
              tags: ["cozy", "easy conversation"],
              rerankAdjustment: 0.05,
            },
          ],
        },
        finalists,
      ),
    ).toEqual([
      {
        placeId: "top-choice",
        firstDateSuitability: 0.91,
        tags: ["cozy", "easy conversation"],
        rerankAdjustment: 0.05,
      },
    ]);

    expect(() =>
      parseAiVenueAdjustments(
        {
          venues: [
            {
              placeId: "missing-place",
              firstDateSuitability: 0.91,
              tags: ["cozy"],
              rerankAdjustment: 0.05,
            },
          ],
        },
        finalists,
      ),
    ).toThrow("unknown finalist");

    expect(() =>
      parseAiVenueAdjustments(
        {
          venues: [
            {
              placeId: "top-choice",
              firstDateSuitability: 1.5,
              tags: ["cozy"],
              rerankAdjustment: 0.05,
            },
          ],
        },
        finalists,
      ),
    ).toThrow("firstDateSuitability");

    expect(() =>
      parseAiVenueAdjustments(
        {
          venues: [
            {
              placeId: "top-choice",
              firstDateSuitability: 0.9,
              tags: ["cozy", 42],
              rerankAdjustment: 0.05,
            },
          ],
        },
        finalists,
      ),
    ).toThrow("tags");

    expect(() =>
      parseAiVenueAdjustments(
        {
          venues: [
            {
              placeId: "top-choice",
              firstDateSuitability: 0.9,
              tags: ["cozy"],
              rerankAdjustment: 0.5,
            },
          ],
        },
        finalists,
      ),
    ).toThrow("rerankAdjustment");
  });

  it("calls Gemini only for finalists and merges valid AI adjustments", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      makeCandidate(`candidate-${index + 1}`, {
        rating: 5 - index * 0.05,
        reviewCount: 500 - index * 10,
      }),
    );

    vi.stubEnv("AI_CURATION_ENABLED", "true");
    vi.stubEnv("AI_CURATION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    venues: [
                      {
                        placeId: "candidate-2",
                        firstDateSuitability: 0.99,
                        tags: ["cozy", "great conversation"],
                        rerankAdjustment: 0.08,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 321,
          candidatesTokenCount: 87,
        },
      }),
    });

    const result = await scoreAndCurate(candidates, preferences, 1, midpoint);
    const promoted = result.find((candidate) => candidate.placeId === "candidate-2");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsedBody = JSON.parse(String(requestInit.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const promptPayload = JSON.parse(parsedBody.contents[0]?.parts?.[0]?.text ?? "{}") as {
      venues: Array<{ placeId: string }>;
    };

    expect(promptPayload.venues).toHaveLength(10);
    expect(promptPayload.venues[0]?.placeId).toBe("candidate-1");
    expect(promoted?.score.firstDateSuitability).toBe(0.99);
    expect(promoted?.tags).toEqual(["cozy", "great conversation"]);
  });

  it("falls back to deterministic ranking when the Gemini response is malformed", async () => {
    const candidates = [
      makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
      makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
    ];

    vi.stubEnv("AI_CURATION_ENABLED", "true");
    vi.stubEnv("AI_CURATION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"venues\":[{\"placeId\":\"missing-place\"}]}" }],
            },
          },
        ],
      }),
    });

    const result = await scoreAndCurate(candidates, preferences, 1, midpoint);

    expect(result[0].placeId).toBe("top-choice");
    expect(result[0].tags).toContain("unscored");
  });

  it("logs provider usage metadata on successful Gemini reranks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T22:00:00Z"));

    const candidates = [
      makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
      makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
    ];

    vi.stubEnv("AI_CURATION_ENABLED", "true");
    vi.stubEnv("AI_CURATION_PROVIDER", "gemini");
    vi.stubEnv("AI_CURATION_PROMPT_VERSION", "prompt-v2");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockFetch.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date("2026-04-04T22:00:01Z"));
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      venues: [
                        {
                          placeId: "top-choice",
                          firstDateSuitability: 0.95,
                          tags: ["cozy"],
                          rerankAdjustment: 0.02,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 321,
            candidatesTokenCount: 87,
          },
        }),
      };
    });

    await scoreAndCurate(candidates, preferences, 1, midpoint);

    expect(mockConsoleInfo).toHaveBeenCalledWith(
      "[scoreAndCurate] AI curation completed",
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-2.5-flash",
        promptVersion: "prompt-v2",
        latencyMs: 1000,
        usage: {
          inputTokens: 321,
          outputTokens: 87,
        },
      }),
    );

    vi.useRealTimers();
  });

  it("falls back deterministically and logs timeout failures", async () => {
    const candidates = [
      makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
      makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
    ];

    vi.stubEnv("AI_CURATION_ENABLED", "true");
    vi.stubEnv("AI_CURATION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockFetch.mockRejectedValueOnce(new Error("This operation was aborted"));

    const result = await scoreAndCurate(candidates, preferences, 1, midpoint);

    expect(result[0].placeId).toBe("top-choice");
    expect(result[0].tags).toContain("unscored");
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      "[scoreAndCurate] Falling back to deterministic ranking",
      expect.objectContaining({
        provider: "gemini",
        reason: "provider_timeout",
      }),
    );
  });
});
