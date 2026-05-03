# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Student Meal Pass Marketplace — a mobile app for students and a secure Restaurant Partner Portal (web).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Mobile App (`artifacts/mobile`)
- Expo React Native app for students
- Preview path: `/mobile`

### Restaurant Partner Portal (`artifacts/restaurant-portal`)
- React + Vite web app at `/portal`
- Role-based auth (restaurant_owner, restaurant_staff, admin, super_admin)
- JWT auth via `Authorization: Bearer <token>`
- Pages: Login, Overview, Packages, Daily Prep (Upcoming Meals), Cancellations, Settlements, Invoices & GST, Disputes, Compliance Profile
- Invoices & GST: customer tax invoices (5% GST under Sec 9(5)), commission invoices (18% GST), credit notes, CA export CSV
- Compliance Profile: KYC fields (GSTIN, PAN, FSSAI, bank), payout-paused warning banner if fields missing, tax classification display

### API Server (`artifacts/api-server`)
- Express 5 server mounted at `/api`
- Restaurant portal routes: `/api/restaurant-portal/...`
- Auth middleware: `artifacts/api-server/src/middlewares/restaurantPortalAuth.ts`

## Database Schema (PostgreSQL)

Tables in `lib/db/src/schema/`:
- `portal_users` — restaurant portal user accounts (bcrypt passwords, roles)
- `restaurants` — restaurant records
- `restaurant_access` — many-to-many user↔restaurant with role
- `subscription_packages` — meal pass packages per restaurant
- `meal_orders` — individual daily meal slot records per subscription
- `cancellations` — cancellation records with type + deduction tracking
- `settlement_periods` — weekly payout periods per restaurant

## Demo Credentials (Portal)

| Email | Password | Role | Restaurant |
|---|---|---|---|
| owner@spicegarden.com | demo1234 | restaurant_owner | Spice Garden |
| staff@spicegarden.com | demo1234 | restaurant_staff | Spice Garden |
| owner@curryhouse.com | demo1234 | restaurant_owner | The Curry House |
| admin@mealpass.com | admin1234 | admin | all |
| super@mealpass.com | admin1234 | super_admin | all |

## Codegen Notes

After running codegen (`pnpm --filter @workspace/api-spec run codegen`), `lib/api-zod/src/index.ts` gets an extra line added:
```
export * from "./generated/types";
```
Remove this line manually — it causes duplicate export conflicts in Orval split-mode. The generated files themselves are correct.
