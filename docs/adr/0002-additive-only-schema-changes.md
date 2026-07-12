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
