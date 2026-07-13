import type { Account, AccountType } from "../accounts.js";
import type { Patient } from "../patients.js";
import type { Provider, ProviderCategory } from "../providers.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES: Record<string, string> = {
  "blank-patient-name": "Patient name can't be blank.",
  "duplicate-patient-name": "A patient with that name already exists.",
  "blank-provider-name": "Provider name can't be blank.",
  "duplicate-provider-name": "A provider with that name already exists.",
  "blank-account-name": "Account name can't be blank.",
  "duplicate-account-name": "An account with that name already exists.",
};

const PROVIDER_CATEGORIES: ProviderCategory[] = [
  "medical",
  "dental",
  "vision",
  "pharmacy",
  "other",
];

const ACCOUNT_TYPES: AccountType[] = ["hsa", "fsa", "lpfsa", "personal"];

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

function categoryOptions(selected?: ProviderCategory): string {
  return PROVIDER_CATEGORIES.map((category) => {
    const isSelected = category === selected ? " selected" : "";
    return `<option value="${category}"${isSelected}>${categoryLabel(category)}</option>`;
  }).join("");
}

function accountTypeOptions(): string {
  return ACCOUNT_TYPES.map((type) => {
    const label = type === "personal" ? "Personal" : type.toUpperCase();
    return `<option value="${type}">${label}</option>`;
  }).join("");
}

function accountTypeLabel(type: AccountType): string {
  return type === "personal" ? "Personal" : type.toUpperCase();
}

function accountBadgeClass(type: AccountType): string {
  return type === "personal" ? "badge" : "badge badge-accent";
}

function deleteForm(action: string): string {
  return `
      <form method="post" action="${action}">
        <button type="submit" class="btn-icon btn-icon-critical" title="Delete">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </form>`;
}

function renderPatientRow(patient: Patient): string {
  return `
    <div class="manage-row">
      <span class="manage-row-name">${escapeHtml(patient.name)}</span>
      ${deleteForm(`/manage/patients/${patient.id}/delete`)}
    </div>`;
}

function renderProviderRow(provider: Provider): string {
  return `
    <div class="manage-row">
      <span class="manage-row-name">${escapeHtml(provider.name)}</span>
      <span class="badge">${categoryLabel(provider.category)}</span>
      ${deleteForm(`/manage/providers/${provider.id}/delete`)}
    </div>`;
}

function renderAccountRow(account: Account): string {
  return `
    <div class="manage-row">
      <span class="manage-row-name">${escapeHtml(account.name)}</span>
      <span class="${accountBadgeClass(account.type)}">${accountTypeLabel(account.type)}</span>
      ${deleteForm(`/manage/accounts/${account.id}/delete`)}
    </div>`;
}

export function renderManage(
  patients: Patient[],
  providers: Provider[],
  accounts: Account[],
  errorCode?: string,
): string {
  const patientRows =
    patients.map(renderPatientRow).join("") ||
    `<div class="manage-row"><span>No patients yet.</span></div>`;

  const providerRows =
    providers.map(renderProviderRow).join("") ||
    `<div class="manage-row"><span>No providers yet.</span></div>`;

  const accountRows =
    accounts.map(renderAccountRow).join("") ||
    `<div class="manage-row"><span>No accounts yet.</span></div>`;

  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;
  const errorBanner = errorMessage
    ? `<div class="error-banner">${escapeHtml(errorMessage)}</div>`
    : "";

  const content = `
    ${errorBanner}
    <div class="topline">
      <div>
        <h1>Manage</h1>
        <span class="subtitle">Patients, providers, and accounts</span>
      </div>
    </div>
    <div class="manage-grid">
      <div class="card manage-card">
        <div class="card-header"><h2>Patients</h2></div>
        <div class="card-body">
          ${patientRows}
        </div>
        <form method="post" action="/manage/patients" class="inline-add">
          <input type="text" name="name" placeholder="New patient name…">
          <button type="submit" class="btn btn-sm">Add</button>
        </form>
      </div>
      <div class="card manage-card">
        <div class="card-header"><h2>Providers</h2></div>
        <div class="card-body">
          ${providerRows}
        </div>
        <form method="post" action="/manage/providers" class="inline-add">
          <input type="text" name="name" placeholder="New provider…">
          <select name="category">${categoryOptions()}</select>
          <button type="submit" class="btn btn-sm">Add</button>
        </form>
      </div>
      <div class="card manage-card">
        <div class="card-header"><h2>Accounts</h2></div>
        <div class="card-body">
          ${accountRows}
        </div>
        <form method="post" action="/manage/accounts" class="inline-add">
          <input type="text" name="name" placeholder="New account…">
          <select name="type">${accountTypeOptions()}</select>
          <button type="submit" class="btn btn-sm">Add</button>
        </form>
      </div>
    </div>
  `;

  return layout("Manage · HSA Tracker", "manage", content);
}
