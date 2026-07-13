# Visit documents are user-managed files, not app-managed uploads

Visits need attached documents (EOBs, discharge summaries, after-visit
summaries — not receipts, which document Payments instead). The
default approach would be a browser upload flow: an `<input type="file">`
or the File System Access API, with the app writing the bytes to disk and
tracking each file as a database row. Neither browser API actually exposes
the file's real path to the page (by design, for privacy), so a picker
can't remove the need to organize files somewhere; it can only hand the
app bytes and a bare filename.

Instead, the app never uploads, writes, or deletes files. Each visit gets
a deterministic folder key derived from its own fields —
`<patient>-<date>-visit<id>-<provider>`, slugified — and expects it at
`<dataDir>/visit-files/<key>`. If that folder exists, the app lists
whatever files are in it (read-only, with a link to open each one); if it
doesn't, the visit's Documents section just shows the expected key as a
hint. Creating the folder, naming it correctly, and dropping files into it
is entirely the user's job. The app only records information the user
gives it (a visit's date/patient/provider) — it does not take ownership of
the user's files or filesystem layout.

Because the key is derived from the visit's own date/patient/provider,
editing those fields after the folder exists would silently orphan it. So
once a visit's convention folder exists (even empty), its date, patient,
and provider lock — enforced server-side, not just hidden in the UI —
and only notes stay editable. Deleting the folder unlocks editing again.
