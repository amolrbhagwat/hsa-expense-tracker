# Receipt files are user-managed and keyed by date, Provider, and a disambiguator

Same starting problem as [ADR 0006](./0006-user-managed-visit-files.md): browser
upload APIs don't expose a file's real path, so a picker can't remove the need to
organize files somewhere — it can only hand the app bytes and a bare filename. The
`receipts` table already has a `file_path TEXT NOT NULL` column from the original
schema (`migrations/0001_init.sql`), the same DB-tracked-upload shape ADR 0006
rejected for `visit_documents`. Since `Receipt` has no repository, routes, or UI
yet, that column has never been read or written by any released version — same
"safe to drop outright" bar ADR 0002 carves out. It will be dropped, and `date`,
`provider_id`, and `disambiguator` columns added, when `Receipt` is actually
implemented (it gets its own content screen, like Visit — not a Manage card,
since it's a growing log, not a small picklist).

Each receipt expects its file at
`<dataDir>/receipt-files/<date>-<provider>-<disambiguator>/` — one file per
folder. Unlike Visit's folder listing (which can hold several files), a Receipt
folder holds exactly one, matching the glossary's literal definition of Receipt
as *a file*. Using a directory rather than a bare filename still means the app
never needs to know the file's extension — it just opens whatever single file is
there. If the folder doesn't exist, the receipt's Files section shows the
expected key as a hint, same as Visit.

The row's own `id` stays the primary key (used to fetch/link the row
everywhere else) but is deliberately **not** part of the folder path.
Uniqueness of the path is instead enforced at the schema level:
`UNIQUE(date, provider_id, disambiguator)`. `disambiguator` is
`TEXT NOT NULL DEFAULT 'receipt'` rather than nullable — SQLite's `UNIQUE`
treats NULLs as distinct from each other, so a nullable column would silently
fail to catch two undisambiguated receipts colliding on the same date/Provider;
a non-null default closes that hole (two rows both defaulting to `'receipt'`
compare equal and correctly collide) while also avoiding the trailing-hyphen
artifact a blank-string default would leave in the folder name. A real
collision — two receipts, same date, same Provider, no explicit disambiguator —
is rejected by the constraint, forcing the user to supply one.

**Why the key can include date/Provider without reintroducing ADR 0006's
locking problem: Receipt is fully immutable after creation.** Its date,
Provider, disambiguator, and linked Payments are all fixed at entry — matching
the existing Patient/Provider/Account convention (non-editable, delete +
re-create to fix a mistake), extended with the one exception Visit already
established: `notes` stays editable. Because none of the key's inputs can
change, there's nothing to lock — simpler than Visit's server-side
field-locking, which was only needed because Visit's date/patient/provider stay
editable right up until a folder happens to exist. (Provider itself is also
non-editable and uniquely named, so a slugified Provider name in the path can
never drift out from under an existing folder either.)

**Why Provider isn't derived from the linked Payments.** A receipt's Payment
links are many-to-many and can span more than one Provider (e.g. a
consolidated statement covering an ER visit and a follow-up consult, recorded
as two separate Provider records per the category-splitting rule) or more than
one Patient — there's no non-arbitrary way to collapse that into a single
label. Instead, Provider is a required field chosen by whoever enters the
receipt, picked as whichever fits best, and is never validated against the
linked Payments' actual providers. A future review UI (deferred until Receipt
is built) can display the set of Providers/Patients implied by the linked
Payments and Visits alongside the chosen Provider, so an entry mistake is
visually obvious without the app enforcing consistency it has no principled way
to compute.

**Consequence of immutability**: correcting a misfiled Receipt means delete +
re-create, same as Patient/Provider/Account. Because the folder path no longer
embeds `id`, a correction that only fixes the *Payment links* (leaving date,
Provider, and disambiguator untouched) resolves to the exact same folder path
as before — no file move needed. Only a correction to date, Provider, or the
disambiguator itself changes the path and requires manually moving the file.
The intended workflow is still to enter the receipt, check it against the
Provider/Patient review view, and only then file the physical document —
catching a wrong row before a file exists is free either way.
