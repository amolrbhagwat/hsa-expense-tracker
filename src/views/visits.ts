import type { Patient } from "../patients.js";
import type { Provider, ProviderCategory } from "../providers.js";
import type { Visit, VisitListItem } from "../visits.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES: Record<string, string> = {
  "blank-date": "Visit date can't be blank.",
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

function renderVisitCard(visit: VisitListItem): string {
  const notesLine = visit.notes
    ? `<div class="visit-notes">${escapeHtml(visit.notes)}</div>`
    : "";
  return `
    <div class="visit-card">
      <div class="visit-head">
        <span class="visit-title">${escapeHtml(visit.providerName)}
          <span class="badge">${categoryLabel(visit.providerCategory)}</span>
          <span class="visit-date">${formatDate(visit.date)} · ${escapeHtml(visit.patientName)}</span>
        </span>
        <a href="/visits?edit=${visit.id}" class="btn-icon" title="Edit visit">${editIcon()}</a>
      </div>
      <div class="visit-meta empty-note">No payment recorded for this visit yet</div>
      <div class="visit-meta empty-note">No reimbursement recorded for this visit yet</div>
      ${notesLine}
    </div>`;
}

function renderPanel(
  editingVisit: Visit,
  patients: Patient[],
  providers: Provider[],
): string {
  const provider = providers.find((p) => p.id === editingVisit.providerId);
  const patient = patients.find((p) => p.id === editingVisit.patientId);
  return `
    <div class="scrim"></div>
    <aside class="panel">
      <div class="panel-header">
        <div>
          <h2>${provider ? escapeHtml(provider.name) : "Visit"}</h2>
          <span class="ptsub">${patient ? escapeHtml(patient.name) : ""} · ${formatDate(editingVisit.date)}</span>
        </div>
        <a href="/visits" class="btn-icon" title="Close">${closeIcon()}</a>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <form method="post" action="/visits/${editingVisit.id}/update">
            <div class="field-row">
              <span class="field-label">Date</span>
              <span class="field-value"><input type="date" name="date" value="${escapeHtml(editingVisit.date)}"></span>
            </div>
            <div class="field-row">
              <span class="field-label">Patient</span>
              <span class="field-value"><select name="patientId">${patientOptions(patients, editingVisit.patientId)}</select></span>
            </div>
            <div class="field-row">
              <span class="field-label">Provider</span>
              <span class="field-value"><select name="providerId">${providerOptions(providers, editingVisit.providerId)}</select></span>
            </div>
            <div class="field-row">
              <span class="field-label">Notes</span>
              <span class="field-value"><textarea name="notes" rows="2">${editingVisit.notes ? escapeHtml(editingVisit.notes) : ""}</textarea></span>
            </div>
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary btn-sm">Save</button>
            </div>
          </form>
        </div>

        <div class="panel-section">
          <h3>Documents (0)</h3>
          <div class="upload-drop">Drop a file here or click to add a document</div>
        </div>
      </div>
      <div class="panel-footer">
        <form method="post" action="/visits/${editingVisit.id}/delete">
          <button type="submit" class="btn-critical-ghost">Delete visit</button>
        </form>
      </div>
    </aside>`;
}

export function renderVisits(
  visits: VisitListItem[],
  patients: Patient[],
  providers: Provider[],
  editingVisit?: Visit,
  errorCode?: string,
): string {
  const cards =
    visits.map(renderVisitCard).join("") ||
    `<p class="empty-note">No visits yet.</p>`;

  const canAdd = patients.length > 0 && providers.length > 0;
  const addForm = canAdd
    ? `
    <div class="quickadd">
      <div class="quickadd-title">New visit</div>
      <form method="post" action="/visits" class="quickadd-row">
        <input type="date" name="date">
        <select name="patientId">${patientOptions(patients)}</select>
        <select name="providerId">${providerOptions(providers)}</select>
        <input type="text" name="notes" placeholder="Notes (optional)">
        <button type="submit" class="btn btn-primary btn-sm">Add</button>
      </form>
    </div>`
    : `<div class="quickadd"><div class="quickadd-title">New visit</div><span>Add a patient and provider first, in Manage.</span></div>`;

  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;
  const errorBanner = errorMessage
    ? `<div class="error-banner">${escapeHtml(errorMessage)}</div>`
    : "";

  const panel = editingVisit ? renderPanel(editingVisit, patients, providers) : "";

  const content = `
    ${errorBanner}
    <div class="topline">
      <div>
        <h1>Visits</h1>
        <span class="subtitle">${visits.length} record${visits.length === 1 ? "" : "s"}</span>
      </div>
    </div>
    ${addForm}
    ${cards}
    ${panel}
  `;

  return layout("Visits · HSA Tracker", "visits", content);
}
