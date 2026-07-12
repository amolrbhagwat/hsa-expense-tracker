import { layout, type Tab } from "./layout.js";

export function renderPlaceholder(tab: Tab, title: string): string {
  return layout(`${title} · HSA Tracker`, tab, `<h1>${title}</h1><p>Coming soon.</p>`);
}
