import type { Patient } from "../patients.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES: Record<string, string> = {
  "blank-patient-name": "Patient name can't be blank.",
  "duplicate-patient-name": "A patient with that name already exists.",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPatientRow(patient: Patient): string {
  return `
    <div class="manage-row">
      <span>${escapeHtml(patient.name)}</span>
      <form method="post" action="/manage/patients/${patient.id}/delete">
        <button type="submit" class="btn-icon" title="Delete">✕</button>
      </form>
    </div>`;
}

export function renderManage(patients: Patient[], errorCode?: string): string {
  const patientRows =
    patients.map(renderPatientRow).join("") ||
    `<div class="manage-row"><span>No patients yet.</span></div>`;

  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;
  const errorBanner = errorMessage
    ? `<div class="error-banner">${escapeHtml(errorMessage)}</div>`
    : "";

  const content = `
    ${errorBanner}
    <div class="topline">
      <div>
        <h1>Manage</h1>
        <span class="subtitle">Patients</span>
      </div>
    </div>
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
  `;

  return layout("Manage · HSA Tracker", "manage", content);
}
