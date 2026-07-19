import type { Account, AccountType } from "../accounts.js";
import type { Patient } from "../patients.js";
import type { Payment, PaymentListItem } from "../payments.js";
import type { Provider, ProviderCategory } from "../providers.js";
import type { LinkedReceipt } from "../receipts.js";
import type { VisitListItem } from "../visits.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES: Record<string, string> = {
  "blank-date": "Payment date can't be blank.",
  "invalid-amount": "Enter a valid amount greater than zero.",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryLabel(category: ProviderCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function accountTypeLabel(type: AccountType): string {
  return type === "personal" ? "Personal" : type.toUpperCase();
}

function accountBadgeClass(type: AccountType): string {
  return type === "personal" ? "badge" : "badge badge-accent";
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusPill(accountType: AccountType): string {
  return accountType === "personal"
    ? `<span class="pill pill-warn"><span class="pill-dot"></span>Reimbursable</span>`
    : `<span class="pill pill-neutral"><span class="pill-dot"></span>Settled</span>`;
}

function patientOptions(patients: Patient[], selectedId?: number): string {
  return patients
    .map((patient) => {
      const isSelected = patient.id === selectedId ? " selected" : "";
      return `<option value="${patient.id}"${isSelected}>${escapeHtml(patient.name)}</option>`;
    })
    .join("");
}

function providerOptions(providers: Provider[], selectedId?: number): string {
  return providers
    .map((provider) => {
      const isSelected = provider.id === selectedId ? " selected" : "";
      return `<option value="${provider.id}"${isSelected}>${escapeHtml(provider.name)}</option>`;
    })
    .join("");
}

function accountOptions(accounts: Account[], selectedId?: number): string {
  const option = (account: Account) => {
    const isSelected = account.id === selectedId ? " selected" : "";
    return `<option value="${account.id}"${isSelected}>${escapeHtml(account.name)}</option>`;
  };
  const taxAdvantaged = accounts.filter((a) => a.type !== "personal");
  const personal = accounts.filter((a) => a.type === "personal");
  const groups: string[] = [];
  if (taxAdvantaged.length > 0) {
    groups.push(
      `<optgroup label="Tax-advantaged">${taxAdvantaged.map(option).join("")}</optgroup>`,
    );
  }
  if (personal.length > 0) {
    groups.push(
      `<optgroup label="Personal">${personal.map(option).join("")}</optgroup>`,
    );
  }
  return groups.join("");
}

function editIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

function closeIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

function linksSummary(payment: PaymentListItem): string {
  const parts: string[] = [];
  if (payment.visitCount > 0) {
    parts.push(`${payment.visitCount} visit${payment.visitCount === 1 ? "" : "s"}`);
  }
  if (payment.receiptCount > 0) {
    parts.push(`${payment.receiptCount} receipt${payment.receiptCount === 1 ? "" : "s"}`);
  }
  return parts.length === 0 ? "—" : parts.join(" · ");
}

function renderPaymentRow(payment: PaymentListItem): string {
  return `
    <tr>
      <td>${formatDate(payment.date)}</td>
      <td>${escapeHtml(payment.patientName)}</td>
      <td>${escapeHtml(payment.providerName)} <span class="badge">${categoryLabel(payment.providerCategory)}</span></td>
      <td>${escapeHtml(payment.accountName)} <span class="${accountBadgeClass(payment.accountType)}">${accountTypeLabel(payment.accountType)}</span></td>
      <td class="num">${formatMoney(payment.amountCents)}</td>
      <td>${statusPill(payment.accountType)}</td>
      <td class="row-links">—</td>
      <td class="row-links">${linksSummary(payment)}</td>
      <td><a href="/payments?edit=${payment.id}" class="btn-icon" title="Edit payment">${editIcon()}</a></td>
    </tr>`;
}

function renderDetailFields(
  editingPayment: Payment,
  patients: Patient[],
  providers: Provider[],
  accounts: Account[],
  locked: boolean,
): string {
  if (locked) {
    const patient = patients.find((p) => p.id === editingPayment.patientId);
    const provider = providers.find((p) => p.id === editingPayment.providerId);
    const account = accounts.find((a) => a.id === editingPayment.accountId);
    return `
      <div class="field-row"><span class="field-label">Amount</span><span class="field-value-static">${formatMoney(editingPayment.amountCents)}</span></div>
      <div class="field-row"><span class="field-label">Date</span><span class="field-value-static">${formatDate(editingPayment.date)}</span></div>
      <div class="field-row"><span class="field-label">Patient</span><span class="field-value-static">${patient ? escapeHtml(patient.name) : ""}</span></div>
      <div class="field-row"><span class="field-label">Provider</span><span class="field-value-static">${provider ? escapeHtml(provider.name) : ""}</span></div>
      <div class="field-row"><span class="field-label">Account</span><span class="field-value-static">${account ? escapeHtml(account.name) : ""}</span></div>
      <p class="lock-note">Locked — a Receipt or Reimbursement references this payment. Delete it to edit these fields again.</p>`;
  }
  return `
    <div class="field-row"><span class="field-label">Amount</span><span class="field-value"><input type="text" name="amount" value="${(editingPayment.amountCents / 100).toFixed(2)}"></span></div>
    <div class="field-row"><span class="field-label">Date</span><span class="field-value"><input type="date" name="date" value="${escapeHtml(editingPayment.date)}"></span></div>
    <div class="field-row"><span class="field-label">Patient</span><span class="field-value"><select name="patientId" onchange="filterPaymentVisits(this.value)">${patientOptions(patients, editingPayment.patientId)}</select></span></div>
    <div class="field-row"><span class="field-label">Provider</span><span class="field-value"><select name="providerId">${providerOptions(providers, editingPayment.providerId)}</select></span></div>
    <div class="field-row"><span class="field-label">Account</span><span class="field-value"><select name="accountId">${accountOptions(accounts, editingPayment.accountId)}</select></span></div>`;
}

function renderLinkedReceipts(linkedReceipts: LinkedReceipt[]): string {
  if (linkedReceipts.length === 0) {
    return `<p class="empty-note">No receipts linked.</p>`;
  }
  return linkedReceipts
    .map(
      (receipt) => `
      <div class="link-row">
        <a href="/receipts?view=${receipt.id}" class="lr-main">${escapeHtml(receipt.providerName)}</a>
        <span class="lr-meta">${escapeHtml(receipt.disambiguator)} · ${formatDate(receipt.date)}</span>
      </div>`,
    )
    .join("");
}

function visitPickerRows(
  visits: VisitListItem[],
  linkedVisitIds: number[],
  selectedPatientId: number,
): string {
  return visits
    .map((visit) => {
      const hidden = visit.patientId !== selectedPatientId;
      const checked = linkedVisitIds.includes(visit.id);
      return `
      <label class="pay-pick-row" data-patient-id="${visit.patientId}"${hidden ? ' style="display:none"' : ""}>
        <input type="checkbox" name="visitIds" form="payment-form" value="${visit.id}"${checked ? " checked" : ""}>
        <div class="pp-info">
          <div class="pp-main">${escapeHtml(visit.providerName)}</div>
          <div class="pp-meta">${formatDate(visit.date)}</div>
        </div>
      </label>`;
    })
    .join("");
}

function renderVisitsSection(
  visits: VisitListItem[],
  linkedVisitIds: number[],
  selectedPatientId: number,
): string {
  if (visits.length === 0) {
    return `
      <div class="panel-section">
        <h3>Visits (${linkedVisitIds.length})</h3>
        <p class="empty-note">No visits recorded yet.</p>
      </div>`;
  }
  const anyForPatient = visits.some((v) => v.patientId === selectedPatientId);
  return `
    <div class="panel-section">
      <h3>Visits (${linkedVisitIds.length})</h3>
      <div class="quickadd-picker" id="payment-visit-picker"${anyForPatient ? "" : ' style="display:none"'}>
        ${visitPickerRows(visits, linkedVisitIds, selectedPatientId)}
      </div>
      <p class="empty-note" id="payment-visit-picker-empty"${anyForPatient ? ' style="display:none"' : ""}>No visits for this patient yet.</p>
    </div>
    <script>
      function filterPaymentVisits(patientId) {
        var picker = document.getElementById("payment-visit-picker");
        var any = false;
        picker.querySelectorAll(".pay-pick-row").forEach(function (row) {
          var show = row.dataset.patientId === patientId;
          row.style.display = show ? "" : "none";
          if (show) any = true;
        });
        picker.style.display = any ? "" : "none";
        document.getElementById("payment-visit-picker-empty").style.display = any ? "none" : "";
      }
    </script>`;
}

function renderPanel(
  editingPayment: Payment,
  patients: Patient[],
  providers: Provider[],
  accounts: Account[],
  locked: boolean,
  linkedReceipts: LinkedReceipt[],
  visits: VisitListItem[],
  linkedVisitIds: number[],
): string {
  const patient = patients.find((p) => p.id === editingPayment.patientId);
  const provider = providers.find((p) => p.id === editingPayment.providerId);
  const account = accounts.find((a) => a.id === editingPayment.accountId);

  return `
    <div class="scrim"></div>
    <aside class="panel">
      <div class="panel-header">
        <div>
          <h2>${provider ? escapeHtml(provider.name) : "Payment"}</h2>
          <span class="ptsub">${patient ? escapeHtml(patient.name) : ""} · ${formatDate(editingPayment.date)}</span>
        </div>
        <a href="/payments" class="btn-icon" title="Close">${closeIcon()}</a>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <form method="post" action="/payments/${editingPayment.id}/update" id="payment-form">
            ${renderDetailFields(editingPayment, patients, providers, accounts, locked)}
            <div class="field-row"><span class="field-label">Notes</span><span class="field-value"><textarea name="notes" rows="2">${editingPayment.notes ? escapeHtml(editingPayment.notes) : ""}</textarea></span></div>
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary btn-sm">Save</button>
            </div>
          </form>
        </div>

        <div class="panel-section">
          <h3>Status</h3>
          ${account ? statusPill(account.type) : ""}
        </div>

        ${renderVisitsSection(visits, linkedVisitIds, editingPayment.patientId)}

        <div class="panel-section">
          <h3>Reimbursements</h3>
          <p class="empty-note">Linking reimbursements will be added later.</p>
        </div>

        <div class="panel-section">
          <h3>Receipts (${linkedReceipts.length})</h3>
          ${renderLinkedReceipts(linkedReceipts)}
        </div>
      </div>
      <div class="panel-footer">
        <form method="post" action="/payments/${editingPayment.id}/delete">
          <button type="submit" class="btn-critical-ghost">Delete payment</button>
        </form>
      </div>
    </aside>`;
}

export function renderPayments(
  payments: PaymentListItem[],
  patients: Patient[],
  providers: Provider[],
  accounts: Account[],
  editingPayment?: Payment,
  locked = false,
  errorCode?: string,
  linkedReceipts: LinkedReceipt[] = [],
  visits: VisitListItem[] = [],
  linkedVisitIds: number[] = [],
): string {
  const rows =
    payments.map(renderPaymentRow).join("") ||
    `<tr><td colspan="9" class="empty-note">No payments yet.</td></tr>`;

  const canAdd =
    patients.length > 0 && providers.length > 0 && accounts.length > 0;
  const addForm = canAdd
    ? `
    <div class="quickadd">
      <div class="quickadd-title">New payment</div>
      <form method="post" action="/payments" class="quickadd-row">
        <input type="date" name="date">
        <select name="patientId">${patientOptions(patients)}</select>
        <select name="providerId">${providerOptions(providers)}</select>
        <select name="accountId">${accountOptions(accounts)}</select>
        <input type="text" name="amount" placeholder="0.00">
        <input type="text" name="notes" placeholder="Notes (optional)">
        <button type="submit" class="btn btn-primary btn-sm">Add</button>
      </form>
      <div class="quickadd-hint">Paid from a personal account is marked Reimbursable automatically.</div>
    </div>`
    : `<div class="quickadd"><div class="quickadd-title">New payment</div><span>Add a patient, provider, and account first, in Manage.</span></div>`;

  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;
  const errorBanner = errorMessage
    ? `<div class="error-banner">${escapeHtml(errorMessage)}</div>`
    : "";

  const panel = editingPayment
    ? renderPanel(
        editingPayment,
        patients,
        providers,
        accounts,
        locked,
        linkedReceipts,
        visits,
        linkedVisitIds,
      )
    : "";

  const content = `
    ${errorBanner}
    <div class="topline">
      <div>
        <h1>Payments</h1>
        <span class="subtitle">${payments.length} record${payments.length === 1 ? "" : "s"}</span>
      </div>
    </div>
    ${addForm}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Patient</th><th>Provider</th><th>Account</th>
            <th class="num">Amount</th><th>Status</th><th>Reimbursements</th><th>Links</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${panel}
  `;

  return layout("Payments · HSA Tracker", "payments", content);
}
