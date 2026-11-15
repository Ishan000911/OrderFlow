# OrderFlow

OrderFlow is a production-style e-commerce and inventory operations application built for demonstrating practical full-stack engineering: secure cookie sessions, a polished React storefront, role-based administration, real-time synchronization, and transaction-safe PostgreSQL inventory.

## Highlights

- React 19 + Vite storefront and responsive admin workspace
- Express 5 REST API with Zod validation and consistent errors
- PostgreSQL + Prisma relational model with migrations and seed data
- Opaque server-side sessions in secure HTTP-only cookies, CSRF protection, Argon2id password hashing, CORS, Helmet, and login rate limiting
- Database-backed carts and authoritative checkout pricing
- Atomic conditional stock updates inside serializable transactions
- Customer-scoped checkout idempotency and bounded transaction retries
- Race-safe cancellation that restores stock exactly once
- Socket.IO rooms for inventory, new order, and customer status notifications
- Real database analytics with Recharts visualizations
- Vitest, Supertest-ready API structure, real PostgreSQL concurrency tests, Playwright smoke coverage, and GitHub Actions

## Architecture

```text
Browser (React/Vite)
  ├─ REST + HTTP-only session + CSRF ──> Express /api/v1
  └─ authenticated Socket.IO ──────────> event rooms
                                             │
                                      services + Prisma
                                             │
                                       PostgreSQL 17
```

The client uses TanStack Query for server state. Socket messages carry only change notifications and IDs; receivers invalidate cached queries and refetch authoritative state. Controllers/routes validate and authorize requests, while the checkout and cancellation service owns multi-record transactional workflows.

## Data model

`User` owns `Session`, `CartItem`, and `Order` records. `Product` belongs to a `Category`; order lines preserve `productName` and `unitPrice` snapshots. `InventoryMovement` is an append-only audit of checkout, cancellation, and admin adjustments. Products and historical order lines use restrictive deletes; products are archived through `isActive`.

## Safe checkout

Items are processed in stable product-ID order inside a PostgreSQL `SERIALIZABLE` transaction. Every reservation uses a conditional update:

```sql
UPDATE "Product"
SET "stock" = "stock" - $quantity
WHERE "id" = $product_id AND "stock" >= $quantity;
```

If any row is not updated, the transaction throws and every prior decrement rolls back. Order, lines, movements, and cart clearing commit together. `(userId, idempotencyKey)` is unique; its stored payload hash rejects key reuse with a different cart/address. A committed retry returns the existing order. Cancellation first conditionally changes an eligible order to `CANCELLED`; only the winner can restore stock.

## Local setup

Requirements: Node.js 22+, npm 10+, Docker Desktop.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:5173`. API health: `http://localhost:4000/api/v1/health`.

Demo credentials after seeding:

- Admin: `admin@orderflow.dev` / value of `ADMIN_PASSWORD` (example default: `ChangeMe123!`)
- Customer: `alex@orderflow.dev` / `Customer123!`

The example credentials are local demo values only. Change them outside local development.

## Environment

Copy `.env.example` to `.env`. `DATABASE_URL` is server-only. Only `VITE_API_URL` and `VITE_SOCKET_URL` are exposed to the browser. In production use HTTPS, `COOKIE_SECURE=true`, explicit `CLIENT_URL`, a managed PostgreSQL URL, and `TRUST_PROXY=true` when behind a trusted reverse proxy.

## Verification

```bash
npm run lint
npm test
npm run test:integration -w server
npm run build
npm run e2e -w client
```

Integration tests require the dedicated `orderflow_test` database. Never point `TEST_DATABASE_URL` at production.

## Deployment

Deploy `client/dist` to Vercel or Netlify and the server to a Node host with persistent WebSockets (Render, Railway, Fly.io, or similar). Run `npm run db:deploy -w server` during backend release. Use a same-site arrangement such as `app.example.com` and `api.example.com` when possible; configure the exact frontend origin and HTTPS cookies. A multi-instance backend requires a Socket.IO adapter (for example Redis) and a shared event transport; PostgreSQL correctness does not depend on a single instance.

More detail: [architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), and [interview guide](docs/INTERVIEW_GUIDE.md).

## Trade-offs

- Simulated payment keeps the project focused on inventory correctness.
- Search uses PostgreSQL substring matching; full-text search can be added when catalog size justifies it.
- Socket.IO is single-instance in this version.
- Product images use remote portfolio-demo URLs; production should use an owned image pipeline/CDN.
