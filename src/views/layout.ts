import { baseStyles } from "./styles.js";

export type Tab =
  | "dashboard"
  | "payments"
  | "visits"
  | "reimbursements"
  | "manage";

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "visits", label: "Visits", href: "/visits" },
  { id: "payments", label: "Payments", href: "/payments" },
  { id: "reimbursements", label: "Reimbursements", href: "/reimbursements" },
  { id: "manage", label: "Manage", href: "/manage" },
];

export function layout(title: string, activeTab: Tab, content: string): string {
  const tabsHtml = TABS.map((tab) => {
    const activeClass = tab.id === activeTab ? " tab-active" : "";
    return `<a href="${tab.href}" class="tab${activeClass}">${tab.label}</a>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${baseStyles}</style>
</head>
<body>
<div class="app-shell">
<header class="topbar">
<div class="wordmark">
<span class="mark">HSA/FSA Tracker</span>
</div>
<nav class="tabs">${tabsHtml}</nav>
</header>
<main>${content}</main>
</div>
</body>
</html>`;
}
