CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hsa', 'fsa', 'lpfsa', 'personal'))
);

CREATE TABLE patients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE providers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('medical', 'dental', 'vision', 'pharmacy', 'other'))
);

CREATE TABLE visits (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  provider_id INTEGER NOT NULL REFERENCES providers(id)
);

CREATE TABLE visit_documents (
  id INTEGER PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES visits(id),
  file_path TEXT NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id)
);

CREATE TABLE payment_visits (
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  visit_id INTEGER NOT NULL REFERENCES visits(id),
  PRIMARY KEY (payment_id, visit_id)
);

CREATE TABLE reimbursements (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL CHECK (status IN ('initiated', 'completed'))
);

CREATE TABLE reimbursement_payments (
  reimbursement_id INTEGER NOT NULL REFERENCES reimbursements(id),
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  amount_cents INTEGER NOT NULL,
  PRIMARY KEY (reimbursement_id, payment_id)
);

CREATE TABLE receipts (
  id INTEGER PRIMARY KEY,
  file_path TEXT NOT NULL
);

CREATE TABLE receipt_payments (
  receipt_id INTEGER NOT NULL REFERENCES receipts(id),
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  PRIMARY KEY (receipt_id, payment_id)
);
