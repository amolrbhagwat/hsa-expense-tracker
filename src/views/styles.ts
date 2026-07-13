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
    overflow-x: hidden;
  }
  h1, h2, h3 { margin: 0; font-weight: 400; text-wrap: balance; }
  button, input, select { font-family: inherit; font-size: inherit; color: inherit; }
  button { cursor: pointer; }
  a { color: var(--accent); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

  /* ---------- shell / topbar ---------- */
  .app-shell { min-height: 100vh; }
  .topbar {
    display: flex; align-items: center; gap: 30px; height: 58px; padding: 0 40px;
    background: var(--surface); border-bottom: 1px solid var(--line);
    position: sticky; top: 0; z-index: 30;
  }
  .wordmark { display: flex; align-items: baseline; gap: 9px; flex: none; }
  .wordmark .mark { font-family: var(--font-display); font-size: 19px; color: var(--ink); }
  .tabs { display: flex; height: 100%; gap: 26px; overflow-x: auto; flex: 1; }
  .tab {
    height: 100%; flex: none; display: flex; align-items: center; padding: 0 2px;
    text-decoration: none; border-bottom: 2px solid transparent; margin-bottom: -1px;
    color: var(--ink-soft); font-size: 13.5px; white-space: nowrap;
  }
  .tab:hover { color: var(--ink); }
  .tab.tab-active { color: var(--accent-strong); border-bottom-color: var(--accent); font-weight: 600; }

  main { padding: 30px 40px 70px; max-width: 1180px; margin: 0 auto; }

  .error-banner {
    background: var(--critical-soft); color: var(--critical); border: 1px solid var(--critical);
    border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
  }

  .topline { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
  .topline h1 { font-family: var(--font-display); font-size: 27px; }
  .topline .subtitle { display: block; margin-top: 4px; font-size: 13px; color: var(--ink-soft); }

  /* ---------- buttons ---------- */
  .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px;
    border: 1px solid var(--line-strong); background: var(--surface); font-size: 13px; font-weight: 600;
  }
  .btn:hover { border-color: var(--accent); color: var(--accent-strong); }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .btn-icon {
    display: inline-flex; align-items: center; justify-content: center;
    border: none; background: none; color: var(--ink-faint); padding: 5px; border-radius: 6px;
  }
  .btn-icon:hover { color: var(--accent-strong); background: var(--accent-soft); }
  .btn-icon-critical:hover { color: var(--critical); background: var(--critical-soft); }

  /* ---------- cards ---------- */
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 14px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid var(--line); }
  .card-header h2 { font-size: 12.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--ink-soft); }
  .card-body { padding: 6px 0; }

  .badge {
    display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 5px;
    font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em;
    background: var(--surface-2); border: 1px solid var(--line-strong); color: var(--ink-soft);
  }
  .badge-accent { background: var(--accent-soft); color: var(--accent-strong); border-color: transparent; }

  /* ---------- manage grid ---------- */
  .manage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; align-items: start; }

  /* ---------- manage rows ---------- */
  .manage-row { display: flex; align-items: center; padding: 9px 16px; border-bottom: 1px solid var(--line); font-size: 13px; gap: 8px; }
  .manage-row:last-child { border-bottom: none; }
  .manage-row-name { flex: 1; }

  .inline-add { padding: 10px 16px; display: flex; gap: 6px; border-top: 1px solid var(--line); }
  .inline-add input, .inline-add select { flex: 1; border: 1px solid var(--line-strong); border-radius: 6px; padding: 6px 8px; font-size: 12.5px; background: var(--surface); }

  @media (max-width: 980px) {
    .topbar { padding: 0 18px; gap: 18px; }
    .tabs { gap: 18px; }
    main { padding: 22px 18px 60px; }
  }
`;
