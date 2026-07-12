export const baseStyles = `
  :root {
    --paper:#F5F3F7; --surface:#FFFFFF; --surface-2:#FBFAFD;
    --line:#E3E0E9; --line-strong:#CFCBDA;
    --ink:#221F2B; --ink-soft:#68647D; --ink-faint:#9A96A8;
    --accent:#4C5B99; --accent-strong:#3A4779; --accent-soft:#E8EAF6;
    --success:#2A7A50; --success-soft:#E3F3EA;
    --warning:#A66A08; --warning-soft:#FBF0DC;
    --critical:#B5432F; --critical-soft:#FBE7E2;
    --font-display:"Iowan Old Style","Sitka Small",Georgia,"Times New Roman",serif;
    --font-body:"Seravek","Avenir Next",-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper:#1B1922; --surface:#242231; --surface-2:#2B283A;
      --line:#37344A; --line-strong:#4B4666;
      --ink:#EEEBF3; --ink-soft:#B0ACC0; --ink-faint:#7D7891;
      --accent:#8C97D6; --accent-strong:#AAB3E3; --accent-soft:#2C2E4A;
      --success:#57C98A; --success-soft:#1E3A2C;
      --warning:#E3AC4E; --warning-soft:#3E2F14;
      --critical:#E17C63; --critical-soft:#402019;
    }
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--paper); color: var(--ink); font-family: var(--font-body);
    font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { margin: 0; font-weight: 400; font-family: var(--font-display); }
  a { color: var(--accent); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

  nav.tabs {
    display: flex; gap: 4px; border-bottom: 1px solid var(--line);
    padding: 0 32px; background: var(--surface);
  }
  nav.tabs a.tab {
    display: inline-block; padding: 13px 14px; text-decoration: none;
    color: var(--ink-soft); border-bottom: 2px solid transparent; font-size: 13.5px;
  }
  nav.tabs a.tab:hover { color: var(--ink); }
  nav.tabs a.tab-active { color: var(--accent-strong); border-bottom-color: var(--accent); font-weight: 600; }

  main { padding: 28px 32px 60px; max-width: 1180px; }
`;
