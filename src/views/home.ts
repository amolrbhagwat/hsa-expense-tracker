import { layout } from "./layout.js";

export function renderHome(): string {
  return layout("Dashboard · HSA Tracker", "dashboard", "<h1>Hello, HSA Tracker</h1>");
}
