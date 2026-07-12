# HSA Expense Tracker

Tracks qualified medical payments made either directly from a tax-advantaged
account or out-of-pocket for later reimbursement, along with the receipts
needed to justify them.

## Language

**Payment**:
Money paid to a provider for a qualified medical cost. Its funding Account
determines whether it's already settled (paid from a tax-advantaged
account) or eligible for later Reimbursement (paid from a personal
account). Has a Patient — who the payment was for — and a Provider — who it
was paid to.
_Avoid_: Expense, purchase, transaction

**Account**:
A place money is held or drawn from. Has a type — `hsa`, `fsa`, `lpfsa`, or
`personal` — and its own identity, since multiple accounts of the same type
can exist (e.g. two HSAs from different jobs, several credit cards).
_Avoid_: Card, source

**Patient**:
A managed entity representing who a Payment was for — the account holder,
spouse, or a dependent. A small, stable list you pick from rather than
retype per payment.
_Avoid_: Person, beneficiary

**Provider**:
A managed entity representing who a Payment was made to. Has a name and a
category (e.g. medical, dental, vision, pharmacy, other). Category lives on
the Provider, not the Payment — a provider spanning multiple categories in
practice should be split into separate Provider records.
_Avoid_: Doctor, biller

**Visit**:
A record of an encounter with a Provider on a given date, for a Patient —
independent of when or how it gets paid. Many-to-many with Payment: one
visit can have multiple follow-up payments over time (e.g. an initial copay
plus a later balance-due payment once insurance settles), and one payment
can cover multiple visits at once (e.g. paying visit #2 in full together
with the remaining balance on visit #1). A Payment can also have zero
visits (e.g. a pharmacy purchase).
_Avoid_: Appointment, encounter

**Reimbursement**:
A withdrawal from a tax-advantaged Account (hsa/fsa/lpfsa) that pays back
one or more out-of-pocket Payments. Many-to-many with Payment, and each
link carries its own amount — a payment isn't always reimbursed in full by
a single reimbursement. E.g. a $900 dental payment with only $800 available
in an LPFSA gets $800 reimbursed from the LPFSA and the remaining $100
reimbursed separately from an HSA.
_Avoid_: Withdrawal, payout

**Reimbursable amount**:
The remaining amount of a Payment still eligible for Reimbursement —
payment amount minus the sum of amounts already covered by linked
Reimbursements. Distinct from _reimbursable_ (a boolean: whether the
payment was paid out-of-pocket at all, and so eligible for Reimbursement in
principle) — a payment can be reimbursable (true) with a reimbursable
amount of $0 once fully paid back.
_Avoid_: Outstanding balance, balance due

**Receipt**:
A file documenting one or more Payments. Many-to-many with Payment — a
single receipt can cover several payments (e.g. a provider's ongoing
summary or payment history), and a single payment can have more than one
receipt (e.g. a provider's later receipt that also references a prior
payment).
_Avoid_: Invoice, proof, document
