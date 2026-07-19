import type { PaymentListItem } from "../payments.js";
import type { Provider, ProviderCategory } from "../providers.js";
import type { LinkedPayment, Receipt, ReceiptListItem } from "../receipts.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES: Record<string, string> = {
  "blank-date": "Receipt date can't be blank.",
  "no-payments": "Select at least one payment for this receipt to cover.",
  duplicate: "A receipt with that date, provider, and disambiguator already exists.",
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

function providerOptions(providers: Provider[], selectedId?: number): string {
  return providers
    .map((provider) => {
      const isSelected = provider.id === selectedId ? " selected" : "";
      return `<option value="${provider.id}"${isSelected}>${escapeHtml(provider.name)}</option>`;
    })
    .join("");
}

function openIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function closeIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

function copyIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
    <path d="M11 5V3.5C11 2.67 10.33 2 9.5 2H3.5C2.67 2 2 2.67 2 3.5V9.5C2 10.33 2.67 11 3.5 11H5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
}

function renderReceiptRow(receipt: ReceiptListItem): string {
  return `
    <tr>
      <td>${formatDate(receipt.date)}</td>
      <td>${escapeHtml(receipt.providerName)} <span class="badge">${categoryLabel(receipt.providerCategory)}</span></td>
      <td>${escapeHtml(receipt.disambiguator)}</td>
      <td>${receipt.paymentCount} payment${receipt.paymentCount === 1 ? "" : "s"}</td>
      <td><a href="/receipts?view=${receipt.id}" class="btn-icon" title="View receipt">${openIcon()}</a></td>
    </tr>`;
}

function paymentPickerRows(payments: PaymentListItem[], selectedProviderId?: number): string {
  if (payments.length === 0) {
    return `<p class="empty-note">No payments recorded yet.</p>`;
  }
  return payments
    .map((payment) => {
      const hidden = payment.providerId !== selectedProviderId;
      return `
      <label class="pay-pick-row" data-provider-id="${payment.providerId}"${hidden ? ' style="display:none"' : ""}>
        <input type="checkbox" name="paymentIds" value="${payment.id}">
        <div class="pp-info">
          <div class="pp-main">${escapeHtml(payment.providerName)}</div>
          <div class="pp-meta">${escapeHtml(payment.patientName)} · ${formatDate(payment.date)} · ${formatMoney(payment.amountCents)}</div>
        </div>
      </label>`;
    })
    .join("");
}

function renderQuickadd(providers: Provider[], payments: PaymentListItem[]): string {
  if (providers.length === 0 || payments.length === 0) {
    return `<div class="quickadd"><div class="quickadd-title">New receipt</div><span>Add a provider and at least one payment first.</span></div>`;
  }
  const defaultProviderId = providers[0]!.id;
  const anyForDefault = payments.some((p) => p.providerId === defaultProviderId);
  return `
    <div class="quickadd">
      <div class="quickadd-title">New receipt</div>
      <form method="post" action="/receipts">
        <div class="quickadd-row">
          <input type="date" name="date">
          <select name="providerId" onchange="filterReceiptPayments(this.value)">${providerOptions(providers)}</select>
          <input type="text" name="disambiguator" placeholder="Disambiguator (default: receipt)">
          <input type="text" name="notes" placeholder="Notes (optional)">
        </div>
        <div class="quickadd-picker" id="receipt-payment-picker"${anyForDefault ? "" : ' style="display:none"'}>
          ${paymentPickerRows(payments, defaultProviderId)}
        </div>
        <p class="empty-note" id="receipt-picker-empty"${anyForDefault ? ' style="display:none"' : ""}>No payments for this provider yet.</p>
        <div style="text-align:right; margin-top:8px;">
          <button type="submit" class="btn btn-primary btn-sm">Add receipt</button>
        </div>
      </form>
    </div>
    <script>
      // The provider select only narrows which rows are shown; a checkbox checked under one
      // provider stays checked (just hidden) after switching to another. This lets one receipt
      // cover payments to different providers, e.g. a card-statement receipt bundling several.
      function filterReceiptPayments(providerId) {
        var picker = document.getElementById("receipt-payment-picker");
        var any = false;
        picker.querySelectorAll(".pay-pick-row").forEach(function (row) {
          var show = row.dataset.providerId === providerId;
          row.style.display = show ? "" : "none";
          if (show) any = true;
        });
        picker.style.display = any ? "" : "none";
        document.getElementById("receipt-picker-empty").style.display = any ? "none" : "";
      }
    </script>`;
}

function renderFilesSection(receiptId: number, filesKey: string, files: string[] | undefined): string {
  const checkLink = `<a href="/receipts?view=${receiptId}" class="btn btn-sm">Check for files</a>`;
  const keyLine = `
    <div class="link-row">
      <span class="lr-main"><code>${escapeHtml(filesKey)}</code></span>
      <button type="button" class="btn-icon" data-copy="${escapeHtml(filesKey)}" onclick="navigator.clipboard.writeText(this.dataset.copy)" title="Copy folder name">${copyIcon()}</button>
    </div>`;

  if (files === undefined) {
    return `
      <div class="panel-section">
        <h3>Files</h3>
        <p class="empty-note">Create this folder under <code>receipt-files/</code> in the data folder and drop the receipt file in.</p>
        ${keyLine}
        ${checkLink}
      </div>`;
  }

  const rows =
    files
      .map(
        (filename) => `
      <div class="link-row">
        <span class="lr-main">${escapeHtml(filename)}</span>
        <a href="/receipts/${receiptId}/files/${encodeURIComponent(filename)}/open" target="_blank" class="lr-meta">Open</a>
      </div>`,
      )
      .join("") || `<p class="empty-note">No files in this receipt's folder yet.</p>`;

  return `
    <div class="panel-section">
      <h3>Files (${files.length})</h3>
      ${keyLine}
      ${rows}
      ${checkLink}
    </div>`;
}

function renderViewPanel(
  receipt: Receipt,
  providers: Provider[],
  linkedPayments: LinkedPayment[],
  filesKey: string,
  files: string[] | undefined,
): string {
  const provider = providers.find((p) => p.id === receipt.providerId);
  const paymentRows =
    linkedPayments
      .map(
        (payment) => `
      <div class="link-row">
        <span class="lr-main">${escapeHtml(payment.providerName)}</span>
        <span class="lr-meta">${escapeHtml(payment.patientName)} · ${formatDate(payment.date)} · ${formatMoney(payment.amountCents)}</span>
      </div>`,
      )
      .join("") || `<p class="empty-note">No payments linked.</p>`;

  return `
    <div class="scrim"></div>
    <aside class="panel">
      <div class="panel-header">
        <div>
          <h2>${provider ? escapeHtml(provider.name) : "Receipt"}</h2>
          <span class="ptsub">${escapeHtml(receipt.disambiguator)} · ${formatDate(receipt.date)}</span>
        </div>
        <a href="/receipts" class="btn-icon" title="Close">${closeIcon()}</a>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <div class="field-row"><span class="field-label">Date</span><span class="field-value-static">${formatDate(receipt.date)}</span></div>
          <div class="field-row"><span class="field-label">Provider</span><span class="field-value-static">${provider ? escapeHtml(provider.name) : ""}</span></div>
          <div class="field-row"><span class="field-label">Disambiguator</span><span class="field-value-static">${escapeHtml(receipt.disambiguator)}</span></div>
          <p class="lock-note">Receipts are fixed at entry — delete and re-create to correct a mistake.</p>
          <form method="post" action="/receipts/${receipt.id}/update">
            <div class="field-row"><span class="field-label">Notes</span><span class="field-value"><textarea name="notes" rows="2">${receipt.notes ? escapeHtml(receipt.notes) : ""}</textarea></span></div>
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary btn-sm">Save notes</button>
            </div>
          </form>
        </div>

        <div class="panel-section">
          <h3>Payments (${linkedPayments.length})</h3>
          ${paymentRows}
        </div>

        ${renderFilesSection(receipt.id, filesKey, files)}
      </div>
      <div class="panel-footer">
        <form method="post" action="/receipts/${receipt.id}/delete">
          <button type="submit" class="btn-critical-ghost">Delete receipt</button>
        </form>
      </div>
    </aside>`;
}

export function renderReceipts(
  receipts: ReceiptListItem[],
  payments: PaymentListItem[],
  providers: Provider[],
  options: {
    viewingReceipt?: Receipt;
    linkedPayments?: LinkedPayment[];
    filesKey?: string;
    files?: string[];
    errorCode?: string;
  } = {},
): string {
  const rows =
    receipts.map(renderReceiptRow).join("") ||
    `<tr><td colspan="5" class="empty-note">No receipts yet.</td></tr>`;

  const errorMessage = options.errorCode ? ERROR_MESSAGES[options.errorCode] : undefined;
  const errorBanner = errorMessage
    ? `<div class="error-banner">${escapeHtml(errorMessage)}</div>`
    : "";

  let panel = "";
  if (options.viewingReceipt) {
    panel = renderViewPanel(
      options.viewingReceipt,
      providers,
      options.linkedPayments ?? [],
      options.filesKey ?? "",
      options.files,
    );
  }

  const content = `
    ${errorBanner}
    <div class="topline">
      <div>
        <h1>Receipts</h1>
        <span class="subtitle">${receipts.length} record${receipts.length === 1 ? "" : "s"}</span>
      </div>
    </div>
    ${renderQuickadd(providers, payments)}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Provider</th><th>Disambiguator</th><th>Payments</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${panel}
  `;

  return layout("Receipts · HSA Tracker", "receipts", content);
}
