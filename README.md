# Dateflow

**AI-powered first date planner.** Two people, one shared shortlist, zero awkward "so what do you want to do?" moments.

Dateflow owns the planning layer that every dating app abandons — the gap between "we matched" and "we have a plan."

```mermaid
flowchart LR
    A["🔥 You matched\non a dating app"] --> B["📋 Both enter\npreferences"]
    B --> C["🤖 AI generates\nvenue shortlist"]
    C --> D["👆 Both swipe\nprivately"]
    D --> E["🎉 Mutual match\n= the plan"]

    style A fill:#FF6B6B,stroke:#CC5555,color:#fff
    style B fill:#4ECDC4,stroke:#3BA89F,color:#fff
    style C fill:#45B7D1,stroke:#3891A6,color:#fff
    style D fill:#96CEB4,stroke:#7AB89A,color:#fff
    style E fill:#FFEAA7,stroke:#DCC480,color:#333
```

> **The gap every dating app ignores** — from "we should hang out" to "we have a plan" — **Dateflow fills it in under 2 minutes.**

---

## How It Works

```mermaid
sequenceDiagram
    participant A as 👤 Person A
    participant D as 🟣 Dateflow
    participant B as 👤 Person B

    A->>D: Opens Dateflow, enters preferences
    D->>A: Generates share link
    A->>B: Pastes link in iMessage / WhatsApp
    B->>D: Opens link (no install, no account)
    B->>D: Enters preferences in 60 seconds
    D->>D: AI generates 5-8 venues near both
    D->>A: Swipe on venues privately
    D->>B: Swipe on venues privately
    D-->>A: 🎉 First mutual match = the plan!
    D-->>B: 🎉 Directions + calendar in one tap
```

---

## Docs

### [`docs/planning/`](docs/planning/) — Strategy and product planning

| Doc | What you'll learn |
|-----|------------------|
| [Overview](docs/planning/overview.md) | What Dateflow is, who it's for, and why it's needed |
| [Competitive Landscape](docs/planning/competitive-landscape.md) | Who else is in this space and where they fall short |
| [Strategy](docs/planning/strategy.md) | Marketing channels, B2B play, and key decisions |
| [Execution Plan](docs/planning/execution-plan.md) | Phased roadmap, tech stack, and go-to-market |
| [Person B Experience](docs/planning/person-b-experience.md) | Why Person B's first 3 seconds decide everything |
| [Implementation Guide](docs/planning/implementation.md) | Architecture, data model, and system design |
| [User Stories](docs/planning/user-stories.md) | Prioritized feature backlog with INVEST scoring |

### [`docs/business/`](docs/business/) — Business strategy and team operations

| Doc | What you'll learn |
|-----|------------------|
| [User Acquisition Strategy](docs/business/user-acquisition-strategy.md) | Tiered playbook to get 100 real session pairs |
| [Team Tooling](docs/business/team-tooling.md) | GitHub Projects kanban setup for the business team |
| [First Sprint](docs/business/first-sprint.md) | Pre-launch and launch week checklist |

### [`docs/dev-specs/`](docs/dev-specs/) — Implementation specifications

| Doc | What you'll learn |
|-----|------------------|
| [Onboarding](docs/dev-specs/onboarding.md) | Start here if you're writing code |
| [Full Index](docs/dev-specs/index.md) | Class registry, API registry, state machine |

---

## Status

**Pre-MVP** — Planning complete, development underway.

```mermaid
flowchart LR
    A["✅ Planning"] --> B["✅ Business\nStrategy"]
    B --> C["✅ Dev Specs"]
    C --> D["🔄 Scaffolding"]
    D --> E["⬜ Core\nSession Flow"]
    E --> F["⬜ MVP\nLaunch"]

    style A fill:#2ECC71,stroke:#27AE60,color:#fff
    style B fill:#2ECC71,stroke:#27AE60,color:#fff
    style C fill:#2ECC71,stroke:#27AE60,color:#fff
    style D fill:#F39C12,stroke:#D68910,color:#fff
    style E fill:#BDC3C7,stroke:#95A5A6,color:#333
    style F fill:#BDC3C7,stroke:#95A5A6,color:#333
```
