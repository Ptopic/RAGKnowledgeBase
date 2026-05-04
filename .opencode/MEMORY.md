# Agent Memory — RAGKnowledgeBase

## Project-wide Rules (always apply)

### After Every Code Change: Biome Formatting
After every feature, bug fix, improvement, or any code modification:

1. Run `biome format --write` on `backend/`
2. Run `biome format --write` on `frontend/`

Project uses **Biome**, not Prettier. Do not leave files in Prettier formatting.

This rule was established on 2026-05-04 after accidental Prettier formatting contaminated the codebase.

---

## Test Conventions

- Backend tests use **Jest** with `ts-jest`
- All unit tests live in `src/**/*.spec.ts`
- Path aliases (`src/`) resolved via Jest `moduleNameMapper` in `package.json`
- Auth test command: `npm run test:auth` (runs `jest src/auth/ --no-coverage --runInBand`)
- E2E tests: `npm run test:e2e` (config at `test/jest-e2e.json`)

---

## Project Context

- Backend: NestJS + Prisma + PostgreSQL + @biomejs/biome v2.3.x
- Frontend: Next.js 15 + Tailwind + React Query + @biomejs/biome v2.1.x
- Monorepo under `/backend` and `/frontend`
- Branch: `feature/email-password-auth` (security fixes in progress)
- NO git commands — user handles version control manually
