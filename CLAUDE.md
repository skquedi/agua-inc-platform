# CLAUDE.md — Agua Inc. Engineering Platform

This file defines coding standards and conventions for the `agua-inc-platform` repository. All contributors (human and AI) must follow these guidelines.

---

## Language & Runtime

- **TypeScript 5.x** — strict mode enabled (`"strict": true` in tsconfig). No `any` unless absolutely unavoidable, and even then add a comment explaining why.
- **Node.js 18+** — use native `crypto.randomUUID()` and `crypto.timingSafeEqual()`. Do not add third-party UUID libraries.
- **ESM vs CJS** — this project uses CommonJS (`"module": "commonjs"` in tsconfig). Do not introduce ESM-only packages.

---

## Project Structure

```
src/api/        REST endpoints — one file per resource (projects.ts, teams.ts)
src/webhooks/   Inbound event handlers — one file per integration
src/utils/      Pure utilities and service clients
tests/          Mirror src/ structure — tests/api/, tests/webhooks/, tests/utils/
```

- Keep route handlers thin. Business logic goes in `src/utils/` or dedicated service classes.
- One router file per resource. Do not put multiple unrelated resources in the same file.

---

## TypeScript Conventions

- Use `interface` for object shapes that describe data (API request/response bodies, DB rows).
- Use `type` for unions, intersections, and aliases (`ProjectStatus`, `Region`).
- Prefer `z.infer<typeof schema>` to duplicate type definitions alongside Zod schemas.
- Never use `!` non-null assertion in production code. Handle `undefined` explicitly.
- Avoid `as` type casts except at API/library boundaries where TypeScript can't infer the type.

---

## API Design

- All routes are versioned: `/api/v1/...`
- Paginated list endpoints must accept `page` and `pageSize` query params (max `pageSize` = 100).
- All mutation endpoints (`POST`, `PATCH`) must validate the request body with a Zod schema via `validateBody()`.
- Use soft-deletes (set `status = 'cancelled'`) for project records. Hard-deletes destroy audit trail.
- HTTP status codes: `201` for created resources, `204` for successful deletes, `422` for validation failures, `404` for not found.
- Error responses must always include a `code` string field (e.g., `PROJECT_NOT_FOUND`, `VALIDATION_ERROR`).

---

## Webhook Security

- **Always verify HMAC signatures** before processing any webhook payload. Use `verifyHmacSignature()` from `src/utils/validation.ts`.
- Acknowledge with `202 Accepted` immediately; process asynchronously with `setImmediate()` or a job queue.
- Never log raw webhook bodies — they may contain PII or secret tokens.

---

## Logging

- Use the `logger` from `src/utils/logger.ts` everywhere. Never use `console.log` in production code.
- Log at `info` for significant state changes (project created, webhook processed).
- Log at `warn` for recoverable issues (unknown event types, signature mismatches).
- Log at `error` only when an exception is caught or a downstream call fails.
- Structured log fields must use `camelCase` keys.
- Never log sensitive data: API tokens, webhook secrets, user passwords, PII.

---

## Testing

- Test files live under `tests/` mirroring `src/` structure.
- Use **supertest** for HTTP integration tests against the Express app.
- Each test file should cover: happy path, validation errors, not-found cases, and auth/signature rejection.
- Aim for **80%+ line coverage** on `src/utils/` and `src/api/`.
- Do not mock the Express app or internal modules — test against the real router to catch wiring bugs.
- Use `beforeAll` / `beforeEach` to set up test state; `afterAll` / `afterEach` to clean up.

---

## Git Workflow

- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes followed by a short slug.
  - Example: `feat/clickup-bulk-sync`, `fix/webhook-signature-timing`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add bulk ClickUp task import endpoint`
  - `fix: handle empty history_items array in ClickUp webhook`
  - `chore: update zod to 3.22.4`
- PRs require at least one approval before merge.
- Squash-merge feature branches into `main`.

---

## Environment Variables

- All secrets and environment-specific config must come from environment variables — never hardcode them.
- Reference `.env.example` for the full list of required variables.
- Use `process.env.VAR ?? 'default'` pattern; fail fast with a thrown `Error` for required vars with no safe default (see `buildClickUpSyncClient()`).

---

## Dependencies

- Prefer the standard library and already-present dependencies over adding new ones.
- Any new dependency must be discussed in the PR description with justification.
- Security patches (`npm audit fix`) are always approved and don't need a review.

---

## AI Assistant Instructions

When Claude Code works in this repo:

1. Follow all conventions in this file.
2. Do not add comments that describe *what* the code does — code should be self-documenting via naming.
3. Only add comments to explain *why*: hidden constraints, subtle invariants, workarounds for known bugs.
4. Do not create new abstractions unless a pattern repeats 3+ times.
5. Run `npm test` (or confirm tests would pass) before marking implementation tasks complete.
6. Prefer editing existing files over creating new ones.
7. Commit each logical section separately with a descriptive Conventional Commits message.
