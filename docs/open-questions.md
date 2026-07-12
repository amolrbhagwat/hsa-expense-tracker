# Open Questions

## Frontend approach
Server-rendered pages + HTMX vs. a full SPA framework (React/Vue/Svelte).
HTMX supports the live-filtering and inline-editing requirements with less
tooling; a SPA would offer more power if client-side complexity grows.

## Database access
Raw SQL via `better-sqlite3` vs. an ORM/query builder (e.g. Drizzle, Kysely)
for type-safe queries as the schema grows.

## Migration mechanism
How schema changes are actually applied (numbered SQL migration files run at
startup, vs. some other approach). Decided separately: whatever the
mechanism, changes must be additive-only (see ADR — schema compatibility).
