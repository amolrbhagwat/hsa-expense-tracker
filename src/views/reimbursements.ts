import type { Account, AccountType } from "../accounts.js";
import type {
  LinkedReimbursementPayment,
  ReimbursablePayment,
  Reimbursement,
  ReimbursementListItem,
  ReimbursementStatus,
} from "../reimbursements.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES: Record<string, string> = {
  "blank-date": "Reimbursement date can't be blank.",
  "no-payments": "Select at least one payment for this reimbursement to cover.",
  "invalid-amount":
    "Each covered payment's amount must be greater than zero and no more than its remaining reimbursable amount.",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function accountTypeLabel(type: AccountType): string {
  return type === "personal" ? "Personal" : type.toUpperCase();
}

function statusPill(status: ReimbursementStatus): string {
  return status === "completed"
    ? `<span class="pill pill-good"><span class="pill-dot"></span>Completed</span>`
    : `<span class="pill pill-warn"><span class="pill-dot"></span>Initiated</span>`;
}

function accountOptions(accounts: Account[], selectedId?: number): string {
  return accounts
    .map((account) => {
      const isSelected = account.id === selectedId ? " selected" : "";
      return `<option value="${account.id}"${isSelected}>${escapeHtml(account.name)}</option>`;
    })
    .join("");
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

function renderCoversCell(linkedPayments: LinkedReimbursementPayment[]): string {
  if (linkedPayments.length === 0) return "—";
  return linkedPayments
    .map(
      (payment) =>
        `<span class="chip">${escapeHtml(payment.providerName)} · ${formatMoney(payment.amountCents)}</span>`,
    )
    .join(" ");
}

function renderReimbursementRow(
  reimbursement: ReimbursementListItem,
  linkedPayments: LinkedReimbursementPayment[],
): string {
  return `
    <tr>
      <td>${formatDate(reimbursement.date)}</td>
      <td>${escapeHtml(reimbursement.accountName)} <span class="badge badge-accent">${accountTypeLabel(reimbursement.accountType)}</span></td>
      <td>${statusPill(reimbursement.status)}</td>
      <td class="row-links">${renderCoversCell(linkedPayments)}</td>
      <td class="num">${formatMoney(reimbursement.totalCents)}</td>
      <td><a href="/reimbursements?edit=${reimbursement.id}" class="btn-icon" title="Edit reimbursement">${editIcon()}</a></td>
    </tr>`;
}

function paymentPickerRows(
  payments: ReimbursablePayment[],
  currentAllocations: Map<number, number>,
): string {
  if (payments.length === 0) {
    return `<p class="empty-note">No reimbursable payments available.</p>`;
  }
  return payments
    .map((payment) => {
      const currentAmountCents = currentAllocations.get(payment.id);
      const checked = currentAmountCents !== undefined;
      const defaultCents = currentAmountCents ?? payment.reimbursableAmountCents;
      return `
      <label class="pay-pick-row">
        <input type="checkbox" name="paymentIds" value="${payment.id}"${checked ? " checked" : ""} onchange="updateReimbursementTotal()">
        <div class="pp-info">
          <div class="pp-main">${escapeHtml(payment.providerName)}</div>
          <div class="pp-meta">${escapeHtml(payment.patientName)} · ${formatDate(payment.date)} · up to ${formatMoney(payment.reimbursableAmountCents)}</div>
        </div>
        <input type="text" name="amount_${payment.id}" value="${(defaultCents / 100).toFixed(2)}" oninput="updateReimbursementTotal()">
      </label>`;
    })
    .join("");
}

function renderPickerScript(): string {
  return `
    <script>
      function updateReimbursementTotal() {
        var total = 0;
        document.querySelectorAll("#reimbursement-picker .pay-pick-row").forEach(function (row) {
          var checkbox = row.querySelector('input[type="checkbox"]');
          var amountInput = row.querySelector('input[type="text"]');
          if (checkbox.checked) {
            var val = parseFloat(amountInput.value);
            if (!isNaN(val)) total += val;
          }
        });
        var totalEl = document.getElementById("reimbursement-total");
        if (totalEl) totalEl.textContent = "$" + total.toFixed(2);
      }
      updateReimbursementTotal();
    </script>`;
}

function renderPickerFields(
  reimbursablePayments: ReimbursablePayment[],
  currentAllocations: Map<number, number>,
): string {
  return `
    <div class="quickadd-picker" id="reimbursement-picker">
      ${paymentPickerRows(reimbursablePayments, currentAllocations)}
    </div>
    <div class="pick-total"><span>Total</span><span id="reimbursement-total">$0.00</span></div>
    ${renderPickerScript()}`;
}

function renderQuickadd(accounts: Account[], canRecord: boolean): string {
  if (!canRecord) {
    return `<div class="quickadd"><div class="quickadd-title">New reimbursement</div><span>Add a tax-advantaged account, in Manage, and a reimbursable payment first.</span></div>`;
  }
  return `
    <div class="quickadd">
      <div class="quickadd-title">New reimbursement</div>
      <form method="get" action="/reimbursements" class="quickadd-row">
        <input type="hidden" name="new" value="1">
        <input type="date" name="date">
        <select name="accountId">${accountOptions(accounts)}</select>
        <select name="status">
          <option value="initiated" selected>Initiated</option>
          <option value="completed">Completed</option>
        </select>
        <button type="submit" class="btn btn-primary btn-sm" style="margin-left: auto;">Select payments →</button>
      </form>
    </div>`;
}

function renderNewPanel(
  accounts: Account[],
  reimbursablePayments: ReimbursablePayment[],
  prefill: { date?: string; accountId?: number; status?: ReimbursementStatus },
): string {
  return `
    <div class="scrim"></div>
    <aside class="panel">
      <div class="panel-header">
        <div><h2>New reimbursement</h2></div>
        <a href="/reimbursements" class="btn-icon" title="Close">${closeIcon()}</a>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <form method="post" action="/reimbursements">
            <div class="field-row"><span class="field-label">Date</span><span class="field-value"><input type="date" name="date" value="${prefill.date ? escapeHtml(prefill.date) : ""}"></span></div>
            <div class="field-row"><span class="field-label">Account</span><span class="field-value"><select name="accountId">${accountOptions(accounts, prefill.accountId)}</select></span></div>
            <div class="field-row"><span class="field-label">Status</span><span class="field-value">
              <select name="status">
                <option value="initiated"${prefill.status === "completed" ? "" : " selected"}>Initiated</option>
                <option value="completed"${prefill.status === "completed" ? " selected" : ""}>Completed</option>
              </select>
            </span></div>
            <div class="field-row"><span class="field-label">Notes</span><span class="field-value"><textarea name="notes" rows="2"></textarea></span></div>
            ${renderPickerFields(reimbursablePayments, new Map())}
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary btn-sm">Save</button>
            </div>
          </form>
        </div>
      </div>
    </aside>`;
}

function renderEditPanel(
  reimbursement: Reimbursement,
  accounts: Account[],
  reimbursablePayments: ReimbursablePayment[],
  linkedPayments: LinkedReimbursementPayment[],
  locked: boolean,
): string {
  const account = accounts.find((a) => a.id === reimbursement.accountId);
  const currentAllocations = new Map(linkedPayments.map((p) => [p.id, p.amountCents]));

  const detailFields = locked
    ? `
      <div class="field-row"><span class="field-label">Date</span><span class="field-value-static">${formatDate(reimbursement.date)}</span></div>
      <div class="field-row"><span class="field-label">Account</span><span class="field-value-static">${account ? escapeHtml(account.name) : ""}</span></div>
      <div class="field-row"><span class="field-label">Status</span><span class="field-value-static">${statusPill(reimbursement.status)}</span></div>
      <p class="lock-note">Locked — this reimbursement is completed. Delete it to correct a mistake.</p>
      <div class="panel-section">
        <h3>Covers</h3>
        ${renderCoversCell(linkedPayments)}
      </div>`
    : `
      <div class="field-row"><span class="field-label">Date</span><span class="field-value"><input type="date" name="date" value="${escapeHtml(reimbursement.date)}"></span></div>
      <div class="field-row"><span class="field-label">Account</span><span class="field-value"><select name="accountId">${accountOptions(accounts, reimbursement.accountId)}</select></span></div>
      <div class="field-row"><span class="field-label">Status</span><span class="field-value">
        <select name="status">
          <option value="initiated"${reimbursement.status === "initiated" ? " selected" : ""}>Initiated</option>
          <option value="completed"${reimbursement.status === "completed" ? " selected" : ""}>Completed</option>
        </select>
      </span></div>`;

  const pickerSection = locked
    ? ""
    : renderPickerFields(reimbursablePayments, currentAllocations);

  return `
    <div class="scrim"></div>
    <aside class="panel">
      <div class="panel-header">
        <div>
          <h2>${account ? escapeHtml(account.name) : "Reimbursement"}</h2>
          <span class="ptsub">${formatDate(reimbursement.date)}</span>
        </div>
        <a href="/reimbursements" class="btn-icon" title="Close">${closeIcon()}</a>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <form method="post" action="/reimbursements/${reimbursement.id}/update">
            ${detailFields}
            <div class="field-row"><span class="field-label">Notes</span><span class="field-value"><textarea name="notes" rows="2">${reimbursement.notes ? escapeHtml(reimbursement.notes) : ""}</textarea></span></div>
            ${pickerSection}
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary btn-sm">Save</button>
            </div>
          </form>
        </div>
      </div>
      <div class="panel-footer">
        <form method="post" action="/reimbursements/${reimbursement.id}/delete">
          <button type="submit" class="btn-critical-ghost">Delete reimbursement</button>
        </form>
      </div>
    </aside>`;
}

export function renderReimbursements(
  reimbursements: ReimbursementListItem[],
  accounts: Account[],
  reimbursablePayments: ReimbursablePayment[],
  paymentsByReimbursementId: Map<number, LinkedReimbursementPayment[]>,
  options: {
    creating?: boolean;
    newPrefill?: { date?: string; accountId?: number; status?: ReimbursementStatus };
    editingReimbursement?: Reimbursement;
    locked?: boolean;
    errorCode?: string;
  } = {},
): string {
  const rows =
    reimbursements
      .map((r) => renderReimbursementRow(r, paymentsByReimbursementId.get(r.id) ?? []))
      .join("") || `<tr><td colspan="6" class="empty-note">No reimbursements yet.</td></tr>`;

  const canRecord = accounts.length > 0 && reimbursablePayments.length > 0;

  const errorMessage = options.errorCode ? ERROR_MESSAGES[options.errorCode] : undefined;
  const errorBanner = errorMessage
    ? `<div class="error-banner">${escapeHtml(errorMessage)}</div>`
    : "";

  let panel = "";
  if (options.creating && canRecord) {
    panel = renderNewPanel(accounts, reimbursablePayments, options.newPrefill ?? {});
  } else if (options.editingReimbursement) {
    panel = renderEditPanel(
      options.editingReimbursement,
      accounts,
      reimbursablePayments,
      paymentsByReimbursementId.get(options.editingReimbursement.id) ?? [],
      options.locked ?? false,
    );
  }

  const content = `
    ${errorBanner}
    <div class="topline">
      <div>
        <h1>Reimbursements</h1>
        <span class="subtitle">${reimbursements.length} record${reimbursements.length === 1 ? "" : "s"}</span>
      </div>
    </div>
    ${renderQuickadd(accounts, canRecord)}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Account</th><th>Status</th><th>Covers</th><th class="num">Total</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${panel}
  `;

  return layout("Reimbursements · HSA Tracker", "reimbursements", content);
}
