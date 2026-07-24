# HSA Expense Tracker

Tracks qualified medical payments — paid directly from a tax-advantaged
account or out-of-pocket for later reimbursement — along with the receipts
and visit documents needed to justify them. Domain terms (Payment, Account,
Visit, Receipt, Reimbursement, etc.) are defined in [CONTEXT.md](CONTEXT.md).

## Background

Built as a single-user, local-first tool: no login, no shared server, no
sync between household members (see [ADR 0001](docs/adr/0001-local-only-per-instance.md)).
Each person who wants to track their own expenses runs their own instance
against their own local SQLite database. Server-rendered HTML + HTMX
([ADR 0004](docs/adr/0004-htmx-frontend.md)) and raw SQL via better-sqlite3
([ADR 0005](docs/adr/0005-raw-sql-no-orm.md)) keep it to one process, no
build pipeline or ORM required.

## Setup

```bash
git clone https://github.com/amolrbhagwat/hsa-expense-tracker.git
cd hsa-expense-tracker
npm install
npm run dev     # runs from source with auto-reload (tsx)
```

Once it's running, start at **Manage** (`/manage`) — Patients, Providers,
and Accounts need at least one entry each before Payments, Visits, or
Receipts have anything to reference.

or, for a built version:

```bash
npm run build
npm start        # runs dist/index.js
```

The app reads its data directory (SQLite file, `visit-files/`,
`receipt-files/`) from the current working directory, so always launch it
from the directory where you want that data to live — run
`node scripts/new-instance.js <path>` to set one up, which drops launchers
(`run.sh` and `run.bat`) there. Schema migrations in `migrations/` run
automatically on startup; no separate migrate step.

Visit and receipt attachments are files you manage yourself on disk, not
uploads — the app expects them at deterministic folder paths derived from
each record's fields and just lists what it finds there (see
[ADR 0006](docs/adr/0006-user-managed-visit-files.md) and
[ADR 0007](docs/adr/0007-user-managed-receipt-files.md)).

## Screens

- **Dashboard** (`/`) — landing page. Not yet implemented (stub).
- **Payments** (`/payments`) — the core log of money paid to a Provider for
  a Patient. Quick-add plus inline edit; locks once a Receipt or
  Reimbursement links to it.
- **Visits** (`/visits`) — encounters with a Provider, independent of
  payment. Links to Payments and to a user-managed folder of visit
  documents (EOBs, after-visit summaries).
- **Receipts** (`/receipts`) — proof documents linked to one or more
  Payments, with a provider-scoped quick-add and their own user-managed
  file folder. Immutable after creation except for notes.
- **Reimbursements** (`/reimbursements`) — withdrawals from a tax-advantaged
  account that pay back out-of-pocket Payments. Not yet implemented
  (placeholder screen).
- **Manage** (`/manage`) — small picklists behind the other screens:
  Patients, Providers, and Accounts. Start here — everything else
  references these.

## Caveat: do not run this over a network

The server binds to `127.0.0.1` only and has no authentication
([ADR 0003](docs/adr/0003-localhost-only-binding.md)). It's built on the
assumption of a trusted single user on localhost — do not rebind it to
`0.0.0.0`, port-forward it, or expose it via a network filesystem mount.
Besides the missing auth layer, SQLite's file-locking isn't safe over
network filesystems (NFS/SMB/SSHFS), which is also why there's no
shared-host deployment option ([ADR 0001](docs/adr/0001-local-only-per-instance.md)).
