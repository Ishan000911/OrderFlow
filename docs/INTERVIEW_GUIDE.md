# Interview guide

## Why PostgreSQL rather than MongoDB?

Orders, inventory, products, and users have strong relationships and invariants. PostgreSQL provides foreign keys, check constraints, atomic conditional updates, and serializable transactions—the exact tools needed to prevent overselling. A document database would not improve this model and would make multi-record invariants harder to explain and enforce.

## Why React, Express, and Prisma?

React makes stateful customer/admin interfaces composable. Express keeps the HTTP pipeline explicit and approachable. Prisma provides type-aware generated queries even in JavaScript, migrations, relations, and transaction APIs; raw SQL is retained only where affected-row semantics give a stronger concurrency guarantee.

## ACID and the final unit

Atomicity means every reservation/order write commits or none do. Consistency preserves constraints such as nonnegative stock. Isolation prevents concurrent workflows from observing unsafe intermediate state. Durability keeps a committed order. Two buyers can read a product, but each must win a conditional `stock >= quantity` update. Only one can decrement the final unit.

## Race conditions and idempotency

A race occurs when correctness depends on timing between concurrent operations. Checkout avoids check-then-write assumptions: the database update performs both. Idempotency addresses network retries. A customer/key pair is unique and stores a canonical request hash. Same key and same payload returns the committed order; same key and different payload is a conflict.

## Safe cancellation

The transaction first changes status only when the current state is `PENDING` or `CONFIRMED`. Concurrent callers compete for that single conditional transition. Only the caller that updates one row restores line quantities and records movements, preventing double restocking.

## Socket.IO and indexes

Socket.IO upgrades compatible connections and provides rooms/event semantics. Cookies authenticate the handshake. Events trigger refetches rather than becoming data truth. Indexes accelerate category/active catalog filters, order history/status queues, session lookup/expiry, SKU/email uniqueness, and inventory monitoring, at the cost of write overhead.

## How this scales

Add stateless API replicas, a Socket.IO Redis adapter, managed PostgreSQL pooling/read replicas, CDN-hosted media, and background workers for non-critical notifications. Keep checkout synchronous and database-transactional. Measure before splitting services; a modular monolith is the clearer placement-project trade-off.
