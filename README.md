# Agua Inc. Engineering Platform

**agua-inc-platform** is the internal engineering backbone for Agua Inc. — a global water solutions company with 1,500 employees, 800+ concurrent projects, and operations across 10 countries. This platform serves as the single source of truth for project tracking, team management, and toolchain integration as we migrate from **Jira + GitHub** to **ClickUp + GitHub**.

---

## Overview

| Capability | Details |
|---|---|
| **REST API** | Node.js / TypeScript / Express 4 |
| **Project tracking** | CRUD for 800+ active projects |
| **Webhook integrations** | GitHub (push, PR) ↔ ClickUp bidirectional sync |
| **Regions covered** | LATAM, EMEA, APAC, NORTH_AMERICA, SOUTH_ASIA |
| **Teams** | 90+ engineering teams across 10 countries |
| **Test framework** | Jest with ts-jest |

---

## Repository Structure

```
agua-inc-platform/
├── src/
│   ├── api/                  # Express REST API
│   │   ├── index.ts          # App bootstrap & route wiring
│   │   ├── projects.ts       # /api/v1/projects CRUD
│   │   ├── teams.ts          # /api/v1/teams management
│   │   ├── health.ts         # /health liveness & readiness probes
│   │   └── types.ts          # Shared TypeScript types
│   ├── webhooks/
│   │   ├── github.ts         # GitHub push/PR event handler
│   │   └── clickup.ts        # ClickUp status/priority sync handler
│   └── utils/
│       ├── logger.ts         # Winston structured logger
│       ├── validation.ts     # Zod middleware + HMAC signature verification
│       ├── clickupSync.ts    # ClickUp API client (outbound sync)
│       └── errorHandler.ts   # Express error & 404 handlers
├── tests/
│   ├── api/
│   │   └── projects.test.ts
│   ├── webhooks/
│   │   └── github.test.ts
│   └── utils/
│       └── validation.test.ts
├── .env.example
├── CLAUDE.md
├── jest.config.js
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env with your ClickUp API token, GitHub webhook secrets, etc.
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
npm start
```

### Run tests

```bash
npm test
npm run test:watch   # watch mode during development
```

---

## API Reference

### Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects` | List projects (paginated, filterable) |
| `GET` | `/api/v1/projects/:id` | Get a single project |
| `POST` | `/api/v1/projects` | Create a new project |
| `PATCH` | `/api/v1/projects/:id` | Update project fields |
| `DELETE` | `/api/v1/projects/:id` | Soft-delete (sets status to `cancelled`) |

**Filter params for `GET /api/v1/projects`:**
`page`, `pageSize`, `status`, `region`, `teamId`, `search`

### Teams

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/teams` | List all teams |
| `GET` | `/api/v1/teams/:id` | Get a team |
| `POST` | `/api/v1/teams` | Create a team |
| `PATCH` | `/api/v1/teams/:id/members` | Add/remove team members |

### Webhooks

| Method | Path | Source |
|--------|------|--------|
| `POST` | `/webhooks/github` | GitHub (push, pull_request events) |
| `POST` | `/webhooks/clickup` | ClickUp (task status/priority changes) |

### Health

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |

---

## ClickUp ↔ GitHub Sync Architecture

```
GitHub Repo Push/PR ──► /webhooks/github ──► Queue ──► ClickUp comment / status update
                                                            │
ClickUp Task Change ──► /webhooks/clickup ──► Queue ──► PATCH /api/v1/projects/:id
                                                            │
POST /api/v1/projects ──► ClickUpSyncClient.createTaskFromProject() ──► ClickUp List
```

Both webhook endpoints validate HMAC signatures before processing. Events are acknowledged with `202 Accepted` immediately and processed asynchronously to stay within provider timeout windows.

---

## Deployment

The platform runs on AWS ECS (Fargate) behind an Application Load Balancer. Environment variables are injected via AWS Secrets Manager. The `/health` and `/health/ready` endpoints are wired to ALB health checks and ECS container health checks respectively.

CI/CD is managed through GitHub Actions. See `.github/workflows/` for pipeline definitions.

---

## Contributing

See [CLAUDE.md](./CLAUDE.md) for coding standards. Open a PR using the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).

---

*Agua Inc. Engineering Platform — maintained by the Platform Engineering team.*
