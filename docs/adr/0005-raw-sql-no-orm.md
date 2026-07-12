# Raw SQL via better-sqlite3, no ORM

For a schema this small (a handful of tables: payments, accounts, patients,
providers, visits, reimbursements, receipts), an ORM or query builder
(Prisma, Drizzle, Kysely) adds a schema-definition layer and codegen step
that's more ceremony than value here.

We're using better-sqlite3 directly with hand-written SQL. The SQLite
schema itself (defined via the numbered migration files) is the single
source of truth, not a generated one.
