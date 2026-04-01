# Dateflow — Codex Navigation Guide

**Dateflow** is an AI-powered first date planner. Two people enter preferences, swipe on AI-curated nearby venues, and the first mutual like becomes the plan.

---

## 📍 Quick Orientation

**Status:** Pre-MVP in active development (DS-01 & DS-02 core services + API routes built; Person A UI still placeholder)

**Main Branch:** `main`

**Current Work:** Session management and preference input flows

---

## 🗂️ Directory Structure

```
dateflow-2/
├── web-service/                         # Next.js application (entire product)
│   ├── src/
│   │   ├── app/                         # Next.js App Router
│   │   │   ├── page.tsx                 # Landing page (default Next.js placeholder; Person A flow not yet implemented)
│   │   │   ├── layout.tsx               # Root layout (meta, globals)
│   │   │   ├── api/                     # API routes (organized by feature)
│   │   │   │   └── sessions/
│   │   │   │       ├── route.ts         # POST /api/sessions (create session)
│   │   │   │       ├── [id]/
│   │   │   │       │   ├── route.ts     # GET /api/sessions/[id] (fetch session)
│   │   │   │       │   └── preferences/
│   │   │   │       │       └── route.ts # POST /api/sessions/[id]/preferences
│   │   │   │       └── __tests__/       # API route tests
│   │   │   │
│   │   │   ├── plan/                    # Shared planning flow (Person A & B)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx         # Main planning page
│   │   │   │       └── plan-flow.tsx    # Planning UI logic
│   │   │   │
│   │   │   └── globals.css              # Global styles (Tailwind base)
│   │   │
│   │   ├── components/                  # Reusable React components
│   │   │   ├── hook-screen.tsx          # Person B landing screen
│   │   │   ├── location-screen.tsx      # Shared location input
│   │   │   ├── vibe-screen.tsx          # Shared category selection
│   │   │   ├── loading-screen.tsx       # Loading state
│   │   │   ├── button.tsx               # Common button component
│   │   │   └── logo.tsx                 # Dateflow logo
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts              # Supabase client (browser)
│   │   │   ├── supabase-server.ts       # Supabase client (server-side)
│   │   │   │
│   │   │   ├── types/                   # TypeScript interfaces
│   │   │   │   ├── session.ts           # Session type & helpers
│   │   │   │   ├── preference.ts        # Preference type & helpers
│   │   │   │   └── __tests__/           # Type tests
│   │   │   │
│   │   │   ├── services/                # Business logic (domain models)
│   │   │   │   ├── session-service.ts   # Session CRUD & state transitions
│   │   │   │   ├── session-serializer.ts
│   │   │   │   ├── session-helpers.ts
│   │   │   │   ├── preference-service.ts
│   │   │   │   ├── preference-serializer.ts
│   │   │   │   ├── share-link-service.ts
│   │   │   │   └── __tests__/           # Service tests
│   │   │   │
│   │   │   └── __tests__/               # Supabase client tests
│   │   │
│   │   └── (other utilities as added)
│   │
│   ├── public/                          # Static assets
│   │
│   ├── supabase/
│   │   └── migrations/                  # Database migrations
│   │       ├── 001_create_sessions.sql
│   │       └── 002_create_preferences.sql
│   │
│   ├── package.json
│   ├── bun.lock
│   ├── tsconfig.json
│   └── next.config.ts
│
├── docs/
│   ├── planning/                        # Product & strategy (read first)
│   │   ├── overview.md
│   │   ├── strategy.md
│   │   ├── execution-plan.md
│   │   ├── user-stories.md
│   │   └── person-b-experience.md       # Critical for Person B flow
│   │
│   ├── business/                        # Operations & growth
│   │   ├── user-acquisition-strategy.md
│   │   ├── team-tooling.md
│   │   └── first-sprint.md
│   │
│   ├── dev-specs/                       # Implementation specifications
│   │   ├── onboarding.md                # ⭐ START HERE (5 min)
│   │   ├── index.md                     # Class & API registry
│   │   ├── ds-01-session-management.md
│   │   ├── ds-02-preference-input.md
│   │   ├── ds-03-venue-generation.md
│   │   ├── ds-04-swipe-match.md
│   │   ├── ds-05-post-match-actions.md
│   │   └── ds-06-session-history.md
│   │
│   └── design/                          # Design specs & Figma exports
│       ├── figma-prompt-person-b-flow*.md
│       └── FigmaMakeDesign*/            # Screenshots from Figma
│
├── README.md                            # Product overview (flowcharts, links)
├── AGENTS.md                            # This file
└── .env.example                         # Required env vars (template only)
```

---

## 🎯 Entry Points by Role

### **If you're writing code:**

1. **Understand the context:** Read [`docs/dev-specs/onboarding.md`](docs/dev-specs/onboarding.md) (5 min)
2. **Find your feature:** Check the Spec-by-Spec Summary → find relevant DS (DS-01 through DS-06)
3. **Read the full spec** for that feature
4. **Check types:** Look at "Public Interfaces" section in the spec
5. **Find existing code:** Check `docs/dev-specs/index.md` (Class & API Registry)
6. **Start coding:** Use the same patterns as existing code in `web-service/src/`

### **Current Implementation Status:**

| Feature | Status | Location |
|---------|--------|----------|
| **DS-01: Session Management** | ✅ Services + API built | `src/lib/services/session-*` + `src/app/api/sessions/` |
| **DS-02: Preference Input** | ✅ Services + API + Person B UI built | `src/lib/services/preference-*` + `src/app/api/sessions/[id]/preferences/` + `src/components/` |
| **DS-03: Venue Generation** | ⬜ Not started | Will go in `src/lib/services/venue-*.ts` + `src/app/api/sessions/[id]/venues/` |
| **DS-04: Swipe & Match** | ⬜ Not started | Will go in `src/lib/services/swipe-*.ts` + `src/app/api/sessions/[id]/swipes/` |
| **DS-05: Post-Match** | ⬜ Not started | Will extend result page + calendar routes |
| **DS-06: Session History** | ⬜ Not started | Will add auth, accounts, history view |

### **If you're debugging:**

1. What endpoint? → Find it in the route tree under `src/app/api/`
2. What's the bug? → Check the relevant service in `src/lib/services/`
3. What test is failing? → Check `__tests__/` next to the source file
4. Session stuck in wrong status? → Check session state machine in `onboarding.md`

---

## 🏗️ Architecture

### **Data Model (Current)**

```sql
-- DS-01: Sessions (foundation)
sessions {
  id UUID PK DEFAULT gen_random_uuid()
  status TEXT ('pending_b' | 'both_ready' | 'generating' | 'generation_failed' | 'ready_to_swipe' | 'matched' | 'expired')
  creator_display_name TEXT NOT NULL
  created_at TIMESTAMPTZ DEFAULT now()
  expires_at TIMESTAMPTZ DEFAULT now() + 48h
  matched_venue_id TEXT
}

-- DS-02: Preferences (when both users submit)
preferences {
  id UUID PK DEFAULT gen_random_uuid()
  session_id UUID FK → sessions
  role TEXT ('a' | 'b')
  location JSONB {lat, lng, label}
  budget TEXT ('BUDGET' | 'MODERATE' | 'UPSCALE')
  categories TEXT[] (RESTAURANT, BAR, ACTIVITY, EVENT)
  UNIQUE(session_id, role)
}

-- Future: venues, swipes, accounts, session_accounts
```

See migration files in `web-service/supabase/migrations/` for exact schema.

### **Session State Machine**

```
pending_b (Person A created, waiting for B)
  ↓ (Person B submits preferences)
both_ready (Both submitted, ready for venue gen)
  ↓ (Async venue generation starts)
generating
  ├─→ (Venues ready) → ready_to_swipe (Both can swipe)
  │                       ↓ (Match detected)
  │                     matched ✅
  └─→ (Failed) → generation_failed → retry → generating

Any pre-matched session → expired (after 48h, cleaned up by pg_cron)
```

See **Session Lifecycle** in `docs/dev-specs/onboarding.md` for complete flow.

### **Code Organization by Concern**

| Layer | Purpose | Examples | Max Size |
|-------|---------|----------|----------|
| **API Routes** | HTTP handlers, input validation | `src/app/api/sessions/route.ts` | 100 lines |
| **Services** | Domain logic (no HTTP) | `session-service.ts`, `preference-service.ts` | 200–400 lines |
| **Types** | TypeScript interfaces | `session.ts`, `preference.ts` | 100 lines |
| **Components** | React UI (server + client) | `HookScreen`, `LocationScreen` | 200 lines |
| **Tests** | Unit tests (Vitest format) | `__tests__/session-service.test.ts` | Match source |

**Rule:** If a file hits 400 lines, extract to a new file.

### **Tech Stack**

| Layer | Tech | Version | Why |
|-------|------|---------|-----|
| **Frontend** | Next.js + React | 16.2.1 + 19.2.4 | App Router, server components |
| **Styling** | Tailwind CSS | v4 | Utility-first, fast |
| **Backend** | Next.js API routes | 16.2.1 | Serverless, no DevOps |
| **Database** | Supabase Postgres | Cloud | Managed, realtime, migrations |
| **Type Safety** | TypeScript | v5 | Strict mode enabled |
| **Testing** | Vitest | 4.1.2 | Fast, ESM-native |
| **Linting** | ESLint | v9 | Enforced in CI (`bun run lint` in GitHub Actions) |

---

## 🚀 Development Workflow

### **Setup (First Time)**

```bash
cd web-service
bun install

# Create .env.local with these vars (keep in sync with .env.example):
NEXT_PUBLIC_SUPABASE_URL=<from Supabase project>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase project>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase project>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Never commit `.env.local`.** Only `.env.example` with placeholders.

### **Run Dev Server**

```bash
cd web-service
bun run dev  # http://localhost:3000
```

Hot-reloads on file changes. Check terminal for build errors.

### **Run Tests**

```bash
bun run test                    # All tests
bun run test -- preference      # Filter by name
bun run test -- --watch        # Watch mode
```

Tests are colocated (`__tests__/` next to source).

### **Lint (Enforced)**

```bash
bun run lint  # ESLint (enforced in CI via GitHub Actions)
```

### **Build for Production**

```bash
bun run build  # Creates .next/
bun start      # Runs production bundle locally
```

Build must succeed before any deploy.

---

## 📋 Common Tasks & Code Locations

### **I need to create a new API endpoint**

**File location:** `web-service/src/app/api/[feature]/route.ts`

**Pattern:** Next.js API routes. Examples:
- `src/app/api/sessions/route.ts` (POST create session)
- `src/app/api/sessions/[id]/route.ts` (GET fetch session)
- `src/app/api/sessions/[id]/preferences/route.ts` (POST submit preferences)

**Requirements:**
- ✅ Validate ALL input (type, length, format) at the route boundary
- ✅ Wrap in try-catch, log errors with context
- ✅ Return generic errors to client (never expose internals)
- ✅ Check auth/ownership on mutating routes (Phase 2 feature)
- ✅ Return `NextResponse.json(data, { status })` or throw error

**Test:** Place tests in `__tests__/route.test.ts` next to the route.

### **I need to add/modify a service**

**File location:** `web-service/src/lib/services/[name]-service.ts`

**Pattern:** Services contain domain logic (DB queries, state transitions), no HTTP stuff.

**Examples:**
- `session-service.ts` — `createSession`, `fetchSession`, transition status
- `preference-service.ts` — `submitPreference`, `fetchPreferences`
- `share-link-service.ts` — `generateShareLink`

**Requirements:**
- ✅ Export async functions (not classes)
- ✅ Obtain Supabase client internally via `getSupabaseServerClient()` (no constructor injection)
- ✅ Immutable: no mutations, use spread operators
- ✅ Throw typed errors (or use/create an `AppError` type)
- ✅ Keep helpers as non-exported functions in the same module

**Test:** Place unit tests in `__tests__/[name]-service.test.ts`

**Example:**
```typescript
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function createSession(displayName: string): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ creator_display_name: displayName })
    .select()
    .single();

  if (error) throw error;
  return toSession(data);
}
```

### **I need to add/modify types**

**File locations:**
- `src/lib/types/session.ts` — Session interface + helpers
- `src/lib/types/preference.ts` — Preference interface + helpers
- Add more `.ts` files as new domains emerge

**Pattern:** Interfaces + pure functions for serialization/validation.

**Example:**
```typescript
export interface Session {
  id: string;
  status: SessionStatus;
  created_at: string;
}

export type SessionStatus = 'pending_b' | 'both_ready' | 'generating' | 'ready_to_swipe' | 'matched';

export function isSessionValid(session: unknown): session is Session {
  // Type guard
}
```

### **I need to fetch from Supabase**

**Browser side:** Use `getSupabaseClient()` from `src/lib/supabase.ts`

**Server side:** Use `getSupabaseServerClient()` from `src/lib/supabase-server.ts`

**Pattern:**
```typescript
import { getSupabaseServerClient } from '@/lib/supabase-server';

const { data, error } = await getSupabaseServerClient()
  .from('sessions')
  .select()
  .eq('id', sessionId);

if (error) throw error;
return data;
```

### **I need to add a React component**

**File location:** `web-service/src/components/[name].tsx`

**Pattern:** Use server components by default (Next.js App Router).

**Examples:**
- `HookScreen` — Person B's landing hook
- `LocationScreen` — Location + GPS input
- `VibeScreen` — Category selection
- `LoadingScreen` — Loading state
- `Button` — Reusable button

**Requirements:**
- ✅ Use Tailwind for styling (no inline styles)
- ✅ Keep < 200 lines; extract if larger
- ✅ Accept minimal props; use `clsx` for conditional classes
- ✅ Mark client-side code with `'use client'` at top

### **I need to check if something's already built**

**First:** Check `docs/dev-specs/index.md` (Class Registry & API Registry)

**Second:** Check `docs/dev-specs/onboarding.md` (Spec-by-Spec Summary)

**Third:** Search the codebase:
```bash
grep -r "ClassName" web-service/src
grep -r "/api/endpoint" web-service/src
```

---

## 🧪 Testing Strategy

### **What to Test**

✅ **Always test:**
- API route input validation
- Service methods (domain logic)
- State transitions (session status flow)
- Type guards / validators

⚠️ **Sometimes:**
- Integration tests (full request-response)
- Error handling paths
- Edge cases

❌ **Skip:**
- Component internals (use components, don't test props)
- Type definitions
- Static config

### **Test Format (Vitest)**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createSession } from '../session-service';

describe('session-service', () => {
  it('creates a new session with pending_b status', async () => {
    const session = await createSession('Alex');
    expect(session.status).toBe('pending_b');
    expect(session.id).toBeDefined();
  });
});
```

### **Running Tests**

```bash
bun run test                         # Run all
bun run test -- session-service      # Specific file
bun run test -- --watch             # Watch mode
bun run test -- --coverage          # Coverage report
```

---

## 🔐 Security Checklist

Every commit must pass:

- [ ] No hardcoded secrets (API keys, tokens) — use `.env.local`
- [ ] All API inputs validated at route boundary
- [ ] Errors logged with context, generic message to client
- [ ] No user input concatenated into AI prompts (prompt injection risk)
- [ ] `.env.local` is gitignored
- [ ] No real secrets in `.env.example`

Follow OWASP top 10 guidelines. Validate inputs, parameterize queries, never expose internals in errors.

---

## 📦 Dependencies

**Current (see `web-service/package.json`):**

| Package | Version | Use |
|---------|---------|-----|
| `next` | 16.2.1 | App router, SSR, API routes |
| `react` | 19.2.4 | UI framework |
| `react-dom` | 19.2.4 | DOM rendering |
| `@supabase/supabase-js` | 2.100.1 | Database, auth, realtime client |
| `tailwindcss` | 4 | Utility-first styling |
| `typescript` | 5 | Type safety |
| `vitest` | 4.1.2 | Fast unit tests |
| `eslint` | 9 | Linting |

**Before adding a package:**
1. Check if similar functionality exists (don't duplicate)
2. Review: maintainer count, last publish, known CVEs
3. Run `bun install` to update `bun.lock` and commit the lockfile (CI uses `bun install --frozen-lockfile`)

---

## 🚢 Deployment

- **Frontend:** Vercel (auto-deploys from `main`)
- **Backend:** Vercel serverless functions (same deployment)
- **Database:** Supabase Cloud
- **Cache:** Upstash (Redis-compatible)

**Pre-merge checklist:**
- ✅ All tests pass: `bun run test`
- ✅ Lint passes: `bun run lint`
- ✅ Build succeeds: `bun run build`
- ✅ No secrets in code

---

## 🎓 Learning Path

1. **5 min:** [`docs/dev-specs/onboarding.md`](docs/dev-specs/onboarding.md) — system overview
2. **10 min:** [`docs/planning/overview.md`](docs/planning/overview.md) — product context
3. **15 min:** [`docs/planning/person-b-experience.md`](docs/planning/person-b-experience.md) — critical UX
4. **30 min:** Relevant dev spec (DS-01 through DS-06)
5. **Ongoing:** Use `docs/dev-specs/index.md` (Class & API Registry)

---

## 📂 File Quick Reference

**Start Here:**
- `README.md` — Product overview
- `docs/dev-specs/onboarding.md` — 5-min technical overview
- `docs/dev-specs/index.md` — Class & API registry

**API Routes (DS-01 & DS-02):**
- `web-service/src/app/api/sessions/route.ts` — POST create
- `web-service/src/app/api/sessions/[id]/route.ts` — GET fetch
- `web-service/src/app/api/sessions/[id]/preferences/route.ts` — POST preferences

**Services (DS-01 & DS-02):**
- `web-service/src/lib/services/session-service.ts` — Session CRUD
- `web-service/src/lib/services/preference-service.ts` — Preference CRUD
- `web-service/src/lib/services/share-link-service.ts` — Share links

**Types:**
- `web-service/src/lib/types/session.ts` — Session interface
- `web-service/src/lib/types/preference.ts` — Preference interface

**UI (Person A & B flows):**
- `web-service/src/app/page.tsx` — Landing page (placeholder; Person A flow TBD)
- `web-service/src/app/plan/[id]/page.tsx` — Shared planning page
- `web-service/src/components/hook-screen.tsx` — Person B hook
- `web-service/src/components/location-screen.tsx` — Location input
- `web-service/src/components/vibe-screen.tsx` — Category selection

**Database:**
- `web-service/supabase/migrations/001_create_sessions.sql`
- `web-service/supabase/migrations/002_create_preferences.sql`

---

## 🤝 Code Patterns

### **Service Usage in API Routes**

```typescript
// In API route — services are function-based, not class-based
import { createSession } from '@/lib/services/session-service';

const session = await createSession(displayName);
```

### **Error Handling**

```typescript
try {
  const data = await riskyOperation();
  return NextResponse.json(data);
} catch (err) {
  console.error('[route] operation failed:', err);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

### **Immutability**

```typescript
// WRONG: Mutation
session.status = 'both_ready';

// CORRECT: Immutability
return { ...session, status: 'both_ready' };
```

### **Type Safety**

```typescript
// Always annotate function signatures
async function fetchSession(id: string): Promise<Session> {
  // ...
}

// Use TypeScript's type narrowing
if (error) throw error;
return data; // TypeScript knows error is null here
```

---

## 🐛 Debugging Quick Start

**Session won't transition status?**
1. Check status in Supabase: `SELECT * FROM sessions WHERE id = '...'`
2. Find the route that should transition it (DS-01/DS-02 routes)
3. Add logs to the service method
4. Run test with `bun run test -- --watch`

**Preference not saving?**
1. Check API response in browser DevTools
2. Check Supabase `preferences` table
3. Check input validation in the API route
4. Check the service method

**Component not rendering?**
1. Check browser console for errors
2. Check Next.js terminal for build errors
3. Check that the route is correct
4. Check that the component is being imported

**Test failing?**
1. Run in watch mode: `bun run test -- --watch`
2. Read the error message carefully
3. Check the service/route it's testing
4. Mock Supabase if needed

---

## 📞 Key Contacts

- **Technical questions:** Check the relevant dev spec in `docs/dev-specs/`
- **Product questions:** Check `docs/planning/overview.md`
- **Design questions:** Check `docs/design/figma-prompt-*.md`
- **Still stuck?** Ask Aiden.

---

## 🎯 Current Status

**Latest:** Session management (DS-01) and preference input (DS-02) core services + API routes built. Person B UI flow (hook/location/vibe screens) implemented. Person A homepage still default placeholder.

**Next:** Venue generation (DS-03) — takes both preferences, calculates midpoint, fetches venues, AI scoring.

**Tracking:** See `docs/planning/user-stories.md` for backlog.

---

**Last updated:** 2026-03-30
**For questions:** Consult the relevant dev spec first.
