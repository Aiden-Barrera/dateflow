# AI Curation Strategy

## Summary

Dateflow does not currently make a live LLM call for venue scoring. The current
`scoreAndCurate()` path in
[`web-service/src/lib/services/ai-curation-service.ts`](../../web-service/src/lib/services/ai-curation-service.ts)
always returns the deterministic fallback ranking, even when
`ANTHROPIC_API_KEY` is present.

This is the right default for the current product stage. The venue-generation
pipeline already has strong deterministic signals:

- category overlap between both users
- distance to midpoint
- first-date safety filter
- review/rating quality signal
- round-aware time-of-day fit
- round-specific diversity bonuses

The main product decision is that AI should not replace the ranking engine.
Instead, AI should be layered on top of it as a constrained reranker and tag
generator for a small finalist set.

## Recommendation

Use a hybrid approach:

- deterministic scoring remains the source of truth
- AI is used only for nuanced first-date suitability and user-facing tags
- AI operates on the top 8 to 12 finalists, not the full Places candidate set
- deterministic fallback remains available when the provider is unavailable or
  the API key is missing

This keeps the system:

- cheap
- debuggable
- consistent
- testable
- resilient to API failures

## Why AI Is Not Pivotal

AI is not strictly required to ship high-quality venue ranking for Dateflow.

Reasons:

- The current problem is mostly structured ranking, not open-ended generation.
- Most of the strongest signals are already deterministic.
- Cost compounds because `scoreAndCurate()` is used in both initial generation
  and retry/rerank flows.
- AI-only ranking makes failures harder to reason about and tune.

AI becomes useful when you want:

- softer judgment for "first-date suitability"
- small rerank adjustments among already-good candidates
- user-facing explanation tags like "cozy", "walkable", or "good for easy
  conversation"

## Proposed Production Shape

### Step 1: Deterministic pre-score

Use the existing deterministic path to score all safe candidates and sort them.

Keep:

- `categoryOverlap`
- `distanceToMidpoint`
- `qualitySignal`
- `timeOfDayFit`
- hard safety filtering

Select only the top 8 to 12 candidates for AI reranking.

### Step 2: AI rerank on finalists

Send a compact structured payload to the model that includes:

- round number
- both users' budget and category preferences
- midpoint distance metadata
- the deterministic score breakdown per candidate
- candidate venue facts from Google Places

Ask the model to return only:

- `firstDateSuitability` from 0 to 1
- up to 3 tags
- a small bounded rerank adjustment, such as `-0.1` to `0.1`

Do not ask the model to rescore every dimension from scratch.

### Step 3: Merge with deterministic scoring

The app should compute final rank from:

- deterministic base composite
- AI-provided `firstDateSuitability`
- optional bounded rerank adjustment

That preserves predictability while still letting AI improve taste-level
ranking.

## Suggested API Contract

```ts
type AiVenueInput = {
  placeId: string;
  name: string;
  category: "RESTAURANT" | "BAR" | "ACTIVITY" | "EVENT";
  address: string;
  priceLevel: number;
  rating: number;
  reviewCount: number;
  distanceMetersToMidpoint: number;
  googleTypes: string[];
  deterministic: {
    categoryOverlap: number;
    distanceToMidpoint: number;
    qualitySignal: number;
    timeOfDayFit: number;
    safetyScore: number;
    composite: number;
  };
};

type AiVenueOutput = {
  placeId: string;
  firstDateSuitability: number;
  tags: string[];
  rerankAdjustment: number;
};

type AiCurationResponse = {
  venues: AiVenueOutput[];
};
```

## Prompt Shape

### System prompt

- You rank first-date venues.
- Use only the provided venue facts and score inputs.
- Do not invent attributes not present in the input.
- Return strict JSON matching the schema.
- Keep rerank adjustments small and explainable.

### User payload

Include:

- round number
- Person A preferences
- Person B preferences
- finalist candidates with deterministic score breakdown

Output:

- `placeId`
- `firstDateSuitability`
- `tags`
- `rerankAdjustment`

## Cost Guidance

For Dateflow, the best cost discipline is:

- one compact AI call per full generation, if possible
- or at most one call per round on a trimmed finalist set
- deterministic rerank only for retries unless AI materially improves outcomes

Approximate relative pricing quality bands, based on official provider pricing
checked on 2026-04-03:

- Cheapest viable: Gemini 2.5 Flash-Lite
- Best balance: Gemini 2.5 Flash
- Lowest-friction Anthropic path: Claude Haiku 4.5
- Acceptable OpenAI budget option: GPT-5.4 nano
- Usually too expensive for this use case: Claude Sonnet 4.6, Gemini 2.5 Pro,
  GPT-5.4

## Recommended Rollout

### Phase 1

- keep deterministic ranking as default
- implement provider-backed AI reranking behind a feature flag
- log token usage, latency, and final ranking deltas

### Phase 2

- A/B test deterministic-only vs hybrid rerank
- evaluate whether AI improves match satisfaction or shortlist quality
- keep retries deterministic unless there is clear product benefit

### Phase 3

- tune prompt and finalist-set size
- add caching for repeated rerank prompts where useful
- revisit provider choice using real token and latency data

## Production Readiness Requirements

- strict schema validation on model output
- bounded retry behavior
- deterministic fallback on all AI failures
- token and latency logging
- provider timeout budgeting
- feature flag to disable AI without code changes
- prompt versioning for rollback and experiment tracking

## Conclusion

The production recommendation is:

- do not make AI the primary ranking engine
- keep deterministic scoring as the backbone
- use AI as a constrained reranker and tag generator on finalists

This gives Dateflow the best combination of product quality, cost control, and
operational safety.
