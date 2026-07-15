-- receipts/receipt_payments were never read or written by any released
-- version of the app (no repository, routes, or UI existed) — safe to drop
-- and recreate outright under the ADR 0002 exception, same treatment
-- visit_documents got in 0006_drop_visit_documents.sql. See ADR 0007.
DROP TABLE receipt_payments;
DROP TABLE receipts;

CREATE TABLE receipts (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  disambiguator TEXT NOT NULL DEFAULT 'receipt',
  notes TEXT
);

CREATE UNIQUE INDEX idx_receipts_date_provider_disambiguator
  ON receipts (date, provider_id, disambiguator);

CREATE TABLE receipt_payments (
  receipt_id INTEGER NOT NULL REFERENCES receipts(id),
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  PRIMARY KEY (receipt_id, payment_id)
);
