# Architecture

## Request lifecycle

Express applies request logging, security headers, exact-origin CORS, body limits, and cookie parsing. Protected routes resolve the opaque cookie hash to a non-expired database session. Mutations also compare the `X-CSRF-Token` hash to the session. Zod validates boundary input, role middleware enforces ADMIN-only operations, and the centralized error handler produces stable error envelopes.

## Frontend

React Router owns navigation and role guards. `AuthContext` contains only identity/session UI state. TanStack Query owns API data and mutation invalidation. Feature pages are grouped into auth, customer, and admin surfaces; reusable shell and feedback components avoid page-level duplication.

## Database

PostgreSQL supplies constraints, foreign keys, indexes, atomic updates, and transaction isolation. Prisma covers ordinary relational access; narrowly scoped raw SQL performs conditional inventory/order state changes where the affected-row count is the correctness signal.

## Real time

Socket.IO authenticates from the same session cookie, joins `user:<id>` plus the `admins` room for administrators, and emits only after service promises resolve (after commit). Events tell clients what changed; the REST API remains the source of truth.

## Scaling

Stateless HTTP processes can scale horizontally because sessions and inventory live in PostgreSQL. Socket.IO needs a shared adapter and event backplane at multiple instances. At higher volume, analytics should move to pre-aggregations/read replicas, image assets to object storage/CDN, and session cleanup to a scheduled job.
