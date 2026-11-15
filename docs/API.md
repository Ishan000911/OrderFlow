# REST API

Base URL: `/api/v1`. Success responses are `{ "success": true, "data": ... }`; failures are `{ "success": false, "error": { "code", "message", "details?" } }`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness |
| POST | `/auth/register` | Public | Customer registration |
| POST | `/auth/login` | Public | Create session and CSRF cookie |
| POST | `/auth/logout` | Signed in | Invalidate session |
| GET | `/auth/me` | Signed in | Current identity |
| GET | `/products` | Public | Search/filter/sort/page catalog |
| GET | `/products/:id` | Public | Product by UUID or slug |
| POST/PATCH | `/products[/:id]` | Admin | Create/update/archive product |
| GET/POST/PATCH | `/categories[/:id]` | Mixed | Browse/administer categories |
| GET | `/cart` | Customer | Persistent cart |
| POST | `/cart/items` | Customer | Add product |
| PATCH/DELETE | `/cart/items/:id` | Customer | Change/remove owned item |
| POST | `/orders` | Customer | Checkout; requires `Idempotency-Key` |
| GET | `/orders[/:id]` | Signed in | Owned order history/detail |
| POST | `/orders/:id/cancel` | Owner/Admin | Atomic cancellation |
| GET | `/admin/dashboard` | Admin | Aggregate analytics |
| GET | `/admin/orders` | Admin | Order operations list |
| PATCH | `/admin/orders/:id/status` | Admin | Enforced status transition |
| GET | `/admin/inventory` | Admin | Inventory list |
| PATCH | `/admin/products/:id/inventory` | Admin | Atomic stock adjustment |

State-changing authenticated calls require the readable CSRF cookie value in `X-CSRF-Token`; the authentication cookie remains HTTP-only.
