# Schema changes must be additive-only

Because each person runs their own independent instance (ADR 0001) and
updates it on their own schedule, two instances may run different app
versions against databases of different schema ages at the same time (e.g.
after a laptop rebuild, or an unsynced update).

We require schema migrations to be additive-only: new columns get defaults,
nothing is renamed or dropped outright, and old columns are deprecated rather
than removed. This keeps an older app version able to read a newer database
(and vice versa within reason), so the two independent instances never need
to be kept in lockstep.

**Exception**: a table or column that no released app version ever read or
wrote — so it holds no user data and no app version's behavior depends on
its presence — isn't bound by this rule. It never existed "in the eyes of"
the code or the data, so dropping it can't break compatibility between
instances at different versions. `visit_documents` (added in `0001_init.sql`,
dropped in `0006_drop_visit_documents.sql`) is the first case: superseded by
the user-managed convention-folder approach in ADR 0006 before any release
ever queried it.
