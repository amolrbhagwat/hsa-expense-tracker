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
was paid to. Editable freely until a Receipt or Reimbursement links to it —
at that point all fields lock except notes, since a Reimbursement's
allocation and a Receipt's proof are both fixed against the Payment's
details as they stood at linking time, and neither is expected to come
back and revisit that. Correcting a locked Payment means deleting the
Receipt or Reimbursement referencing it first.
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

**Visit document**:
A file documenting a Visit itself (e.g. an EOB, an after-visit summary) —
separate from Receipt, which documents Payments. One-to-many with Visit. A
document that also needs to justify a Payment is attached again separately
as a Receipt, rather than shared between the two.
_Avoid_: Receipt, EOB

**Reimbursement**:
A withdrawal from a tax-advantaged Account (hsa/fsa/lpfsa) that pays back
one or more out-of-pocket Payments. Many-to-many with Payment, and each
link carries its own amount — a payment isn't always reimbursed in full by
a single reimbursement. E.g. a $900 dental payment with only $800 available
in an LPFSA gets $800 reimbursed from the LPFSA and the remaining $100
reimbursed separately from an HSA. Has a status — `initiated` (submitted to
the account, awaiting transfer) or `completed` (money received).
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
One or more files depicting the same document (e.g. a blurry retake, or a
photo of the front and back) — not a bundle of unrelated documents —
documenting one or more Payments, with its own date (when it was
generated or received, not derived from any linked Payment) and Provider
(chosen as whichever fits best when the receipt covers payments to more
than one Provider — e.g. a hospital's consolidated statement spanning an
ER visit and a follow-up consult recorded under two different Provider
records). Many-to-many with Payment — a single receipt can cover several
payments (e.g. a provider's ongoing summary or payment history), and a
single payment can have more than one receipt (e.g. a provider's later
receipt that also references a prior payment). A substantively different
document — a different date, or covering a different set of Payments —
always gets its own Receipt, never added alongside an existing one.
Non-editable after creation, like Patient/Provider/Account — delete and
re-create to correct a mistake — except for notes, which stay editable.
_Avoid_: Invoice, proof, document
