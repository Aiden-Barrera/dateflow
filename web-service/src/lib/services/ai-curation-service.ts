import type { Preference, Category, Location } from "../types/preference";
import type {
  CuratedVenueCandidate,
  PlaceCandidate,
  VenueScore,
} from "../types/venue";
import { computeVenueComposite } from "../types/venue";
import { mapGoogleTypeToCategory } from "./places-api-client";
import { distanceBetween } from "./midpoint-calculator";
import { scoreSafety } from "./safety-filter";

const REVIEW_COUNT_CAP = 500;
const DEFAULT_AI_FINALIST_COUNT = 10;
const DEFAULT_PROMPT_VERSION = "v1";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GEMINI_MODEL = "gemini-2.5-flash";
const AI_PROVIDER_TIMEOUT_MS = 5_000;

type AiVenueAdjustment = {
  readonly placeId: string;
  readonly firstDateSuitability: number;
  readonly tags: readonly string[];
  readonly rerankAdjustment: number;
};

type AiCurationProvider = "gemini" | "anthropic";

type AiCurationConfig = {
  readonly enabled: boolean;
  readonly provider: string;
  readonly promptVersion: string;
};

type AiResponsePayload = {
  readonly venues?: unknown;
};

type GeminiGenerateContentResponse = {
  readonly candidates?: Array<{
    readonly content?: {
      readonly parts?: Array<{
        readonly text?: string;
      }>;
    };
  }>;
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
  };
};

type AiProviderCallResult = {
  readonly adjustments: readonly AiVenueAdjustment[];
  readonly usage: {
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
  };
};

function roundBonus(category: Category, round: number): number {
  if (round === 2 && (category === "ACTIVITY" || category === "EVENT")) {
    return 0.15;
  }

  if (round === 3 && (category === "ACTIVITY" || category === "BAR")) {
    return 0.05;
  }

  return 0;
}

function categoryOverlapScore(
  category: Category,
  preferences: readonly [Preference, Preference]
): number {
  const [a, b] = preferences;
  const aHas = a.categories.includes(category);
  const bHas = b.categories.includes(category);

  if (aHas && bHas) return 1;
  if (aHas || bHas) return 0.6;
  return 0.2;
}

function distanceScore(candidate: PlaceCandidate, midpoint: Location): number {
  const meters = distanceBetween(candidate.location, midpoint);
  return Math.max(0, 1 - meters / 5_000);
}

function qualitySignal(candidate: PlaceCandidate): number {
  const ratingScore = candidate.rating / 5;
  const clampedReviews = Math.max(1, Math.min(candidate.reviewCount, REVIEW_COUNT_CAP));
  const reviewScore = Math.log(clampedReviews) / Math.log(REVIEW_COUNT_CAP);
  return ratingScore * 0.6 + reviewScore * 0.4;
}

function timeOfDayFit(category: Category, round: number): number {
  if (round === 1) {
    return category === "RESTAURANT" || category === "BAR" ? 1 : 0.6;
  }

  if (round === 2) {
    return category === "ACTIVITY" || category === "EVENT" ? 1 : 0.7;
  }

  return 0.9;
}

function buildFallbackTags(category: Category, candidate: PlaceCandidate): readonly string[] {
  return [
    "unscored",
    ...(candidate.rating >= 4.5 ? ["top-rated"] : []),
    ...(candidate.reviewCount >= 250 ? ["well-reviewed"] : []),
    category.toLowerCase(),
  ];
}

export function buildDeterministicRanking(
  candidates: readonly PlaceCandidate[],
  preferences: readonly [Preference, Preference],
  round: number,
  midpoint: Location
): readonly CuratedVenueCandidate[] {
  return candidates
    .map((candidate) => {
      const category = mapGoogleTypeToCategory(candidate.types);
      const partialScore = {
        categoryOverlap: categoryOverlapScore(category, preferences),
        distanceToMidpoint: distanceScore(candidate, midpoint),
        firstDateSuitability: scoreSafety(candidate),
        qualitySignal: qualitySignal(candidate),
        timeOfDayFit: timeOfDayFit(category, round),
      };

      const baseComposite = computeVenueComposite(partialScore);
      const score: VenueScore = {
        ...partialScore,
        composite: baseComposite,
      };

      const rankingComposite = Math.min(1, baseComposite + roundBonus(category, round));

      return {
        rankingComposite,
        ...candidate,
        category,
        score,
        tags: buildFallbackTags(category, candidate),
      };
    })
    .sort((a, b) => b.rankingComposite - a.rankingComposite)
    .map((rankedCandidate) => {
      const { rankingComposite, ...candidate } = rankedCandidate;
      void rankingComposite;
      return candidate;
    });
}

export function trimFinalistsForAi(
  rankedCandidates: readonly CuratedVenueCandidate[],
  finalistCount: number = DEFAULT_AI_FINALIST_COUNT,
): readonly CuratedVenueCandidate[] {
  return rankedCandidates.slice(0, finalistCount);
}

export function mergeAiAdjustments(
  rankedCandidates: readonly CuratedVenueCandidate[],
  adjustments: readonly AiVenueAdjustment[],
): readonly CuratedVenueCandidate[] {
  const rankedCandidateCount = rankedCandidates.length;
  const adjustmentByPlaceId = new Map(
    adjustments.map((adjustment) => [adjustment.placeId, adjustment]),
  );

  return rankedCandidates
    .map((candidate, index) => {
      const adjustment = adjustmentByPlaceId.get(candidate.placeId);
      const deterministicRankBonus = Math.max(
        0,
        rankedCandidateCount - index,
      ) / (rankedCandidateCount * 10_000);
      const deterministicRankingComposite =
        candidate.score.composite + deterministicRankBonus;

      if (!adjustment) {
        return {
          rankingComposite: deterministicRankingComposite,
          candidate,
        };
      }

      const score = {
        ...candidate.score,
        firstDateSuitability: adjustment.firstDateSuitability,
      };
      const composite = computeVenueComposite({
        categoryOverlap: score.categoryOverlap,
        distanceToMidpoint: score.distanceToMidpoint,
        firstDateSuitability: score.firstDateSuitability,
        qualitySignal: score.qualitySignal,
        timeOfDayFit: score.timeOfDayFit,
      });

      return {
        rankingComposite: Math.min(
          1,
          Math.max(
            0,
            deterministicRankingComposite + adjustment.rerankAdjustment,
          ),
        ),
        candidate: {
          ...candidate,
          score: {
            ...score,
            composite,
          },
          tags: [...adjustment.tags],
        },
      };
    })
    .sort((a, b) => b.rankingComposite - a.rankingComposite)
    .map(({ candidate }) => candidate);
}

export function getAiCurationConfig(): AiCurationConfig {
  const enabled = process.env.AI_CURATION_ENABLED === "true";
  const provider = process.env.AI_CURATION_PROVIDER?.trim() || "gemini";
  const promptVersion =
    process.env.AI_CURATION_PROMPT_VERSION?.trim() || DEFAULT_PROMPT_VERSION;

  return {
    enabled,
    provider,
    promptVersion,
  };
}

export function parseAiVenueAdjustments(
  payload: AiResponsePayload,
  finalists: readonly CuratedVenueCandidate[],
): readonly AiVenueAdjustment[] {
  if (!Array.isArray(payload.venues)) {
    throw new Error("AI response venues must be an array");
  }

  const finalistIds = new Set(finalists.map((candidate) => candidate.placeId));

  return payload.venues.map((venue, index) => {
    if (!venue || typeof venue !== "object") {
      throw new Error(`AI response venues[${index}] must be an object`);
    }

    const candidate = venue as Record<string, unknown>;
    const placeId = candidate.placeId;
    const firstDateSuitability = candidate.firstDateSuitability;
    const tags = candidate.tags;
    const rerankAdjustment = candidate.rerankAdjustment;

    if (typeof placeId !== "string" || placeId.length === 0) {
      throw new Error(`AI response venues[${index}].placeId must be a non-empty string`);
    }

    if (!finalistIds.has(placeId)) {
      throw new Error(`AI response contains unknown finalist placeId: ${placeId}`);
    }

    if (
      typeof firstDateSuitability !== "number" ||
      firstDateSuitability < 0 ||
      firstDateSuitability > 1
    ) {
      throw new Error(
        `AI response venues[${index}].firstDateSuitability must be between 0 and 1`,
      );
    }

    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
      throw new Error(`AI response venues[${index}].tags must be an array of strings`);
    }

    if (
      typeof rerankAdjustment !== "number" ||
      rerankAdjustment < -0.1 ||
      rerankAdjustment > 0.1
    ) {
      throw new Error(
        `AI response venues[${index}].rerankAdjustment must be between -0.1 and 0.1`,
      );
    }

    return {
      placeId,
      firstDateSuitability,
      tags,
      rerankAdjustment,
    };
  });
}

function getProviderApiKey(provider: AiCurationProvider): string {
  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY ?? "";
  }

  return process.env.ANTHROPIC_API_KEY ?? "";
}

function buildAiPromptPayload(
  finalists: readonly CuratedVenueCandidate[],
  preferences: readonly [Preference, Preference],
  round: number,
  midpoint: Location,
) {
  const [a, b] = preferences;

  return {
    round,
    promptVersion: getAiCurationConfig().promptVersion,
    midpoint,
    preferences: {
      a: {
        budget: a.budget,
        categories: a.categories,
      },
      b: {
        budget: b.budget,
        categories: b.categories,
      },
    },
    venues: finalists.map((candidate) => ({
      placeId: candidate.placeId,
      name: candidate.name,
      category: candidate.category,
      address: candidate.address,
      priceLevel: candidate.priceLevel,
      rating: candidate.rating,
      reviewCount: candidate.reviewCount,
      googleTypes: candidate.types,
      deterministic: {
        categoryOverlap: candidate.score.categoryOverlap,
        distanceToMidpoint: candidate.score.distanceToMidpoint,
        firstDateSuitability: candidate.score.firstDateSuitability,
        qualitySignal: candidate.score.qualitySignal,
        timeOfDayFit: candidate.score.timeOfDayFit,
        composite: candidate.score.composite,
      },
    })),
  };
}

async function callGeminiForVenueAdjustments(
  finalists: readonly CuratedVenueCandidate[],
  preferences: readonly [Preference, Preference],
  round: number,
  midpoint: Location,
  apiKey: string,
): Promise<AiProviderCallResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text:
                "Return strict JSON only. Rank first-date venue finalists using only provided fields.",
            },
          ],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify(
                  buildAiPromptPayload(finalists, preferences, round, midpoint),
                ),
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const body = (await response.json()) as GeminiGenerateContentResponse;
    const textBlock = body.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textBlock) {
      throw new Error("Gemini response did not include text content");
    }

    const parsedPayload = JSON.parse(textBlock) as AiResponsePayload;
    return {
      adjustments: parseAiVenueAdjustments(parsedPayload, finalists),
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount ?? null,
        outputTokens: body.usageMetadata?.candidatesTokenCount ?? null,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function classifyAiFallbackReason(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (name === "AbortError" || normalizedMessage.includes("aborted")) {
    return "provider_timeout";
  }

  if (message.includes("AI response")) {
    return "invalid_ai_response";
  }

  return "provider_failure";
}

export async function scoreAndCurate(
  candidates: readonly PlaceCandidate[],
  preferences: readonly [Preference, Preference],
  round: number,
  midpoint: Location
): Promise<readonly CuratedVenueCandidate[]> {
  const deterministicRanking = buildDeterministicRanking(
    candidates,
    preferences,
    round,
    midpoint,
  );
  const aiConfig = getAiCurationConfig();
  const startedAt = Date.now();

  if (!aiConfig.enabled) {
    return deterministicRanking;
  }

  if (aiConfig.provider !== "gemini") {
    console.warn("[scoreAndCurate] Falling back to deterministic ranking", {
      provider: aiConfig.provider,
      promptVersion: aiConfig.promptVersion,
      reason: "unsupported_provider",
      latencyMs: Date.now() - startedAt,
    });
    return deterministicRanking;
  }

  if (!getProviderApiKey(aiConfig.provider)) {
    return deterministicRanking;
  }

  try {
    const finalists = trimFinalistsForAi(deterministicRanking);

    if (aiConfig.provider === "gemini") {
      const result = await callGeminiForVenueAdjustments(
        finalists,
        preferences,
        round,
        midpoint,
        getProviderApiKey("gemini"),
      );

      console.info("[scoreAndCurate] AI curation completed", {
        provider: "gemini",
        model: GEMINI_MODEL,
        promptVersion: aiConfig.promptVersion,
        latencyMs: Date.now() - startedAt,
        usage: result.usage,
      });

      return mergeAiAdjustments(deterministicRanking, result.adjustments);
    }

    return deterministicRanking;
  } catch (err) {
    console.warn("[scoreAndCurate] Falling back to deterministic ranking", {
      provider: aiConfig.provider,
      promptVersion: aiConfig.promptVersion,
      reason: classifyAiFallbackReason(err),
      latencyMs: Date.now() - startedAt,
    });
    return deterministicRanking;
  }
}
