# Dateflow — Claude Navigation Guide

**Dateflow** is an AI-powered first date planner. Two people enter preferences, swipe on AI-curated nearby venues, and the first mutual like becomes the plan.

---

## 📍 Quick Orientation

**Status:** Pre-MVP in active development (DS-01 & DS-02 implementation started)

**Main Branch:** `main`

**Current Work:** Session management and preference input flows

---

## 🗂️ Directory Structure

```
dateflow-2/
├── web-service/                         # Next.js application (entire product)
│   ├── src/
│   │   ├── app/                         # Next.js App Router
│   │   │   ├── page.tsx                 # Person A entry point
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
│   ├── tsconfig.json
│   ├── next.config.js
│   └── tailwind.config.js
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
├── CLAUDE.md                            # This file
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
| **DS-01: Session Management** | ✅ Core built | `src/lib/services/session-*` + `src/app/api/sessions/` |
| **DS-02: Preference Input** | ✅ Core built | `src/lib/services/preference-*` + `src/app/api/sessions/[id]/preferences/` |
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
  id UUID PK
  created_at TIMESTAMP
  status TEXT ('pending_b' | 'both_ready' | 'generating' | 'ready_to_swipe' | 'matched')
  expires_at TIMESTAMP
  person_a_role TEXT ('person_a')
}

-- DS-02: Preferences (when both users submit)
preferences {
  id UUID PK
  session_id UUID FK → sessions
  role TEXT ('person_a' | 'person_b')
  location JSONB {lat, lng, place_name}
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
  ↓ (Venues ready)
ready_to_swipe (Both can swipe)
  ↓ (Match detected)
matched ✅
```

See **Session Lifecycle** in `docs/dev-specs/onboarding.md` for complete flow.

### **Code Organization by Concern**

| Layer | Purpose | Examples | Max Size |
|-------|---------|----------|----------|
| **API Routes** | HTTP handlers, input validation | `src/app/api/sessions/route.ts` | 100 lines |
| **Services** | Domain logic (no HTTP) | `SessionService`, `PreferenceService` | 200–400 lines |
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
| **Linting** | ESLint | v9 | Enforced by pre-commit hook |

---

## 🚀 Development Workflow

### **Setup (First Time)**

```bash
cd web-service
npm install

# Create .env.local with these vars:
NEXT_PUBLIC_SUPABASE_URL=<from Supabase project>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase project>
GOOGLE_PLACES_API_KEY=<request from Aiden>
GOOGLE_GEOCODING_API_KEY=<request from Aiden>
ANTHROPIC_API_KEY=<request from Aiden>
UPSTASH_REDIS_URL=<request from Aiden>
UPSTASH_QSTASH_TOKEN=<request from Aiden>
SENTRY_AUTH_TOKEN=<request from Aiden>
NEXT_PUBLIC_VERCEL_ENV=development
```

**Never commit `.env.local`.** Only `.env.example` with placeholders.

### **Run Dev Server**

```bash
cd web-service
npm run dev  # http://localhost:3000
```

Hot-reloads on file changes. Check terminal for build errors.

### **Run Tests**

```bash
npm test                    # All tests
npm test -- preference      # Filter by name
npm test -- --watch        # Watch mode
```

Tests are colocated (`__tests__/` next to source).

### **Lint (Enforced)**

```bash
npm run lint  # ESLint (pre-commit hook blocks if this fails)
```

### **Build for Production**

```bash
npm run build  # Creates .next/
npm start      # Runs production bundle locally
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
- `SessionService` — create, fetch, transition status
- `PreferenceService` — create, fetch, update preferences
- `ShareLinkService` — generate share links

**Requirements:**
- ✅ Use constructor injection for Supabase client
- ✅ All methods async (may call DB)
- ✅ Immutable: no mutations, use spread operators
- ✅ Throw typed errors (or create `AppError` class)
- ✅ Private helper methods prefixed with `_`

**Test:** Place unit tests in `__tests__/[name]-service.test.ts`

**Example:**
```typescript
export class SessionService {
  constructor(private supabase: SupabaseClient) {}

  async createSession(): Promise<Session> {
    // Create and return, don't mutate
  }
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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../SessionService';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService(mockSupabase);
  });

  it('creates a new session with pending_b status', async () => {
    const session = await service.createSession();
    expect(session.status).toBe('pending_b');
    expect(session.id).toBeDefined();
  });
});
```

### **Running Tests**

```bash
npm test                         # Run all
npm test -- session-service      # Specific file
npm test -- --watch             # Watch mode
npm test -- --coverage          # Coverage report
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

See `~/.claude/rules/common/security.md` for full guidelines.

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
3. Update `package-lock.json` and commit

---

## 🚢 Deployment

- **Frontend:** Vercel (auto-deploys from `main`)
- **Backend:** Vercel serverless functions (same deployment)
- **Database:** Supabase Cloud
- **Cache:** Upstash (Redis-compatible)

**Pre-merge checklist:**
- ✅ All tests pass: `npm test`
- ✅ Lint passes: `npm run lint`
- ✅ Build succeeds: `npm run build`
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
- `web-service/src/app/page.tsx` — Person A homepage
- `web-service/src/app/plan/[id]/page.tsx` — Shared planning page
- `web-service/src/components/hook-screen.tsx` — Person B hook
- `web-service/src/components/location-screen.tsx` — Location input
- `web-service/src/components/vibe-screen.tsx` — Category selection

**Database:**
- `web-service/supabase/migrations/001_create_sessions.sql`
- `web-service/supabase/migrations/002_create_preferences.sql`

---

## 🤝 Code Patterns

### **Service Initialization**

```typescript
// In API route
import { SessionService } from '@/lib/services/session-service';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const sessionService = new SessionService(getSupabaseServerClient());
const session = await sessionService.createSession();
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
4. Run test with `npm test -- --watch`

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
1. Run in watch mode: `npm test -- --watch`
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

**Latest:** Session management (DS-01) and preference input (DS-02) implementation complete.

**Next:** Venue generation (DS-03) — takes both preferences, calculates midpoint, fetches venues, AI scoring.

**Tracking:** See `docs/planning/user-stories.md` for backlog.

---

**Last updated:** 2026-03-30
**For questions:** Consult the relevant dev spec first.
