# DS-03A — Candidate Pool Persistence & Low-Cost Regeneration

**Type:** Supplemental
**Depends on:** DS-03 (Venue Generation Engine)
**Depended on by:** DS-04 (Swipe & Match System), DS-05 (Post-Match Actions)
**Goal:** Support a second swipe cycle without paying the full external generation cost by storing a broader candidate pool and re-scoring it when preferences are adjusted.

---

## Why This Exists

The current DS-03 pipeline stores only the final 12 swipeable venues. That keeps the first pass simple, but it makes retry behavior expensive and weak:

- Reusing the same 12 venues feels repetitive.
- Regenerating a brand-new set always re-runs the expensive external pipeline.
- Forced resolution after round 3 can feel too aggressive if there was no mutual like.

The preferred product direction is:

1. Generate a broader session candidate pool once.
2. Store both the raw candidate snapshot and the final 12 shown venues.
3. After no mutual like, allow a bounded retry path where users adjust a small set of preferences.
4. Re-score from the stored pool first.
5. Only call external APIs again if the stored pool cannot produce a meaningfully fresh next batch.

---

## Product Rules

### Initial Generation

- DS-03 still generates the first 12 swipeable venues.
- In addition, DS-03 persists a broader candidate pool for the session.
- The stored pool must be large enough to support at least one retry cycle without another Places call when possible.

### Retry After No Mutual Like

- Do not silently force a true match from a one-sided like.
- After round 3 with no mutual like, the system should present:
  - one best fallback suggestion from the current shown venues
  - one retry path that allows preference adjustments
- Preference adjustments should be narrow:
  - categories
  - budget
  - optional search radius relaxation

### Retry Cost Policy

- First retry should re-score the stored candidate pool instead of calling Places/AI again.
- Already shown venues should be excluded from the next swipe cycle whenever enough unused candidates remain.
- If the stored pool cannot provide a fresh 12-venue batch, allow at most one full external regeneration.
- Further retries should require an explicit restart or new session.

---

## Data Model Changes

### New Concepts

- `candidate pool`: a session-scoped snapshot of a broader set of venue candidates produced during generation
- `generation batch`: the grouping for one swipe cycle (initial batch, retry batch, full regeneration batch)
- `shown venue history`: tracks which venue ids have already been surfaced to the couple

### Recommended Tables

#### `session_candidate_pools`

Stores the broader pool snapshot for a session.

Suggested fields:

```sql
session_candidate_pools {
  id UUID PK
  session_id UUID FK -> sessions
  source TEXT ('initial_generation' | 'full_regeneration')
  created_at TIMESTAMPTZ
}
```

#### `session_candidate_pool_items`

Stores reusable candidates that can be re-scored without another external fetch.

Suggested fields:

```sql
session_candidate_pool_items {
  id UUID PK
  pool_id UUID FK -> session_candidate_pools
  place_id TEXT
  name TEXT
  category TEXT
  address TEXT
  lat DOUBLE PRECISION
  lng DOUBLE PRECISION
  price_level INT
  rating DOUBLE PRECISION
  photo_url TEXT
  raw_types TEXT[]
  raw_tags TEXT[]
  source_rank INT
  created_at TIMESTAMPTZ
}
```

#### `venue_generation_batches`

Tracks which 12 venues belong to each swipe cycle.

Suggested fields:

```sql
venue_generation_batches {
  id UUID PK
  session_id UUID FK -> sessions
  pool_id UUID FK -> session_candidate_pools
  batch_number INT
  generation_strategy TEXT (
    'initial_pool_rank',
    'pool_rerank',
    'full_regeneration'
  )
  created_at TIMESTAMPTZ
}
```

#### `venues`

Extend existing venue rows with:

```sql
venues {
  generation_batch_id UUID NULL FK -> venue_generation_batches
  surfaced_cycle INT NOT NULL DEFAULT 1
}
```

---

## Service Changes

### VenueGenerationService

New responsibilities:

- Persist a broader candidate pool before narrowing to the first 12
- Create a `venue_generation_batches` record for the initial swipe cycle
- Mark the first 12 venues as surfaced in cycle 1

### New Re-ranking Service

Introduce a dedicated service, for example `VenueRetryService`, that:

- accepts updated preferences
- loads the session candidate pool
- excludes already surfaced venues when possible
- re-scores remaining candidates
- creates a fresh 12-venue batch without another Places call
- falls back to one full regeneration only when the stored pool is insufficient

### Swipe / Match Layer

DS-04 should stop treating the no-match fallback as an automatic true match.

Preferred behavior:

- `matched` stays reserved for mutual like or mutual acceptance of a final suggestion
- no-match after round 3 transitions into a retry/suggestion state
- both users can either:
  - accept the suggested venue
  - retry with adjusted preferences
  - abandon the session

---

## State Machine Impact

Current DS-04 is too narrow because it jumps from round-3 no-match directly to `matched`.

Recommended additional states:

```text
ready_to_swipe
  -> fallback_pending
  -> reranking
  -> ready_to_swipe (new batch)
  -> matched
```

Suggested meaning:

- `fallback_pending`: no mutual like, waiting for users to accept the suggested venue or request retry
- `reranking`: server is building a new swipe batch from the stored pool

---

## Acceptance Criteria

- The first retry after no mutual like does not call Google Places when the stored pool has enough unused candidates.
- Retry batch generation excludes already surfaced venues unless the candidate floor would be too low.
- A session can distinguish between:
  - mutual match
  - suggested fallback
  - rerank retry in progress
- The system enforces a bounded retry policy:
  - one pool-based rerank by default
  - at most one full external regeneration if needed

---

## Immediate Engineering Work

1. Persist a broader candidate pool in DS-03 before selecting the first 12 venues.
2. Introduce generation batch tracking so later swipe cycles stay coherent.
3. Replace DS-04 forced auto-match with a retry/suggestion state.
4. Add a re-ranking service that produces a new batch from stored candidates and updated preferences.
5. Add API support for preference adjustment + retry request after round 3.
