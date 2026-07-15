export const baseStyles = `
  :root {
    --paper:#F5F3F7; --surface:#FFFFFF; --surface-2:#FBFAFD;
    --line:#E3E0E9; --line-strong:#CFCBDA;
    --ink:#221F2B; --ink-soft:#68647D; --ink-faint:#9A96A8;
    --accent:#4C5B99; --accent-strong:#3A4779; --accent-soft:#E8EAF6;
    --success:#2A7A50; --success-soft:#E3F3EA;
    --warning:#A66A08; --warning-soft:#FBF0DC;
    --critical:#B5432F; --critical-soft:#FBE7E2;
    --shadow:0 12px 32px -10px rgba(34,31,43,0.22);
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
      --shadow:0 12px 32px -10px rgba(0,0,0,0.55);
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
  button, input, select, textarea { font-family: inherit; font-size: inherit; color: inherit; }
  button { cursor: pointer; }
  a { color: var(--accent); }
  code { background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; font-size: 12px; }
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
  .topline .actions { display: flex; gap: 8px; }

  /* ---------- buttons ---------- */
  .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px;
    border: 1px solid var(--line-strong); background: var(--surface); font-size: 13px; font-weight: 600;
  }
  .btn:hover { border-color: var(--accent); color: var(--accent-strong); }
  .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent-strong); border-color: var(--accent-strong); color: #fff; }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .btn-icon {
    display: inline-flex; align-items: center; justify-content: center;
    border: none; background: none; color: var(--ink-faint); padding: 5px; border-radius: 6px;
  }
  .btn-icon:hover { color: var(--accent-strong); background: var(--accent-soft); }
  .btn-icon-critical:hover { color: var(--critical); background: var(--critical-soft); }
  .btn-critical-ghost { border: none; background: none; color: var(--critical); font-size: 12.5px; font-weight: 600; padding: 4px 0; }

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

  /* ---------- data tables ---------- */
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
  .data-table th {
    text-align: left; padding: 8px 16px; border-bottom: 1px solid var(--line);
    font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: var(--ink-soft);
  }
  .data-table td { padding: 9px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table td.actions { display: flex; gap: 2px; justify-content: flex-end; }
  .data-table td.num, .data-table th.num { text-align: right; }
  .row-links { color: var(--ink-faint); font-size: 12px; white-space: nowrap; }

  /* ---------- pills ---------- */
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
  .pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill-neutral { background: var(--surface-2); color: var(--ink-soft); border: 1px solid var(--line-strong); }
  .pill-warn { background: var(--warning-soft); color: var(--warning); }
  .pill-good { background: var(--success-soft); color: var(--success); }

  .empty-note { font-size: 12.5px; color: var(--ink-faint); font-style: italic; }

  /* ---------- quick add ---------- */
  .quickadd { background: var(--accent-soft); border: 1px dashed var(--accent); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; }
  .quickadd-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--accent-strong); margin-bottom: 8px; }
  .quickadd-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .quickadd-row input, .quickadd-row select { border: 1px solid var(--line-strong); background: var(--surface); border-radius: 7px; padding: 8px 10px; font-size: 13px; }
  .quickadd-row input[type="date"] { width: 135px; }
  .quickadd-row input[type="text"] { flex: 1; min-width: 140px; }
  .quickadd-hint { margin-top: 7px; font-size: 11.5px; color: var(--accent-strong); opacity: .85; }
  .quickadd-picker { max-height: 160px; overflow-y: auto; margin-top: 10px; border-top: 1px solid var(--line-strong); background: var(--surface); border-radius: 7px; padding: 8px 10px; }

  /* ---------- visit cards ---------- */
  .visit-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
  .visit-head { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px; }
  .visit-title { font-size: 14px; font-weight: 600; }
  .visit-date { color: var(--ink-faint); font-weight: 400; font-size: 12.5px; margin-left: 8px; }
  .visit-meta { font-size: 12.5px; color: var(--ink-soft); margin-top: 4px; }
  .visit-meta.empty-note { font-style: italic; color: var(--ink-faint); }
  .visit-notes { font-size: 12.5px; color: var(--ink-soft); margin-top: 4px; }

  /* ---------- slide-over panel ---------- */
  .scrim { position: fixed; inset: 0; background: rgba(20,18,26,.35); z-index: 40; }
  .panel {
    position: fixed; top: 0; right: 0; height: 100vh; width: 420px; max-width: 92vw; background: var(--surface);
    border-left: 1px solid var(--line); box-shadow: var(--shadow); z-index: 50; display: flex; flex-direction: column;
  }
  .panel-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 18px 14px; border-bottom: 1px solid var(--line); }
  .panel-header h2 { font-family: var(--font-display); font-size: 19px; }
  .panel-header .ptsub { display: block; margin-top: 3px; font-size: 12.5px; color: var(--ink-soft); }
  .panel-body { padding: 6px 18px 18px; overflow-y: auto; flex: 1; }
  .panel-section { padding: 14px 0; border-bottom: 1px solid var(--line); }
  .panel-section:last-child { border-bottom: none; }
  .panel-section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-faint); margin-bottom: 10px; }
  .field-row { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 8px; margin-bottom: 8px; }
  .field-label { font-size: 12px; color: var(--ink-soft); }
  .field-value input, .field-value select, .field-value textarea {
    width: 100%; border: 1px solid var(--line-strong); background: var(--surface); border-radius: 6px; padding: 6px 7px; font-size: 13.5px; font-weight: 500; font-family: inherit; resize: vertical;
  }
  .field-value input:hover, .field-value select:hover, .field-value textarea:hover { border-color: var(--accent); }
  .field-value input:focus, .field-value select:focus, .field-value textarea:focus { border-color: var(--accent); background: var(--surface); }
  .field-value-static { display: block; padding: 6px 7px; font-size: 13.5px; font-weight: 500; color: var(--ink-soft); }
  .lock-note { font-size: 11.5px; color: var(--ink-faint); font-style: italic; margin: 0 0 8px; }
  .panel-footer { padding: 12px 18px; border-top: 1px solid var(--line); text-align: right; }

  .link-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: 12.5px; }
  .link-row .lr-main { font-weight: 600; word-break: break-all; }
  .link-row .lr-meta { color: var(--ink-soft); font-size: 12px; }

  /* ---------- payment picker ---------- */
  .pay-pick-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; cursor: pointer; }
  .pay-pick-row:last-child { border-bottom: none; }
  .pay-pick-row .pp-info { flex: 1; }
  .pay-pick-row .pp-main { font-weight: 600; }
  .pay-pick-row .pp-meta { color: var(--ink-soft); font-size: 11.5px; }

  @media (max-width: 980px) {
    .topbar { padding: 0 18px; gap: 18px; }
    .tabs { gap: 18px; }
    main { padding: 22px 18px 60px; }
    .panel { width: 100vw; max-width: 100vw; }
  }
`;
