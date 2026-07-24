#!/usr/bin/env node
// Sets up a new data directory for a local instance of this app: creates the
// directory (if needed) and drops ready-to-run launchers in it. See
// docs/adr/0001-local-only-per-instance.md for why each instance gets its own
// data directory.
//
// Plain Node (no bash/WSL) so it runs the same way on Windows, macOS, and
// Linux — Node is already required to run the app itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDirArg = process.argv[2];
if (!dataDirArg) {
  console.error("Usage: node scripts/new-instance.js <path-to-data-directory>");
  process.exit(1);
}

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

fs.mkdirSync(dataDirArg, { recursive: true });
const dataDir = fs.realpathSync(dataDirArg);

function toPosixPath(p) {
  if (process.platform !== "win32") return p;
  const match = p.match(/^([a-zA-Z]):\\(.*)$/);
  if (match) {
    const [, drive, rest] = match;
    return `/${drive.toLowerCase()}/${rest.replace(/\\/g, "/")}`;
  }
  return p.replace(/\\/g, "/");
}

function toWindowsPath(p) {
  if (process.platform === "win32") return p;
  const match = p.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (match) {
    const [, drive, rest] = match;
    return `${drive.toUpperCase()}:\\${rest.replace(/\//g, "\\")}`;
  }
  return p.replace(/\//g, "\\");
}

const runSh = `#!/usr/bin/env bash
# The app reads its data directory from cwd, so it must be launched from
# here (see docs/adr/0001-local-only-per-instance.md).
set -euo pipefail
cd "\$(dirname "\$0")"
exec node "${toPosixPath(appDir)}/dist/index.js"
`;
fs.writeFileSync(path.join(dataDir, "run.sh"), runSh, { mode: 0o755 });

const runBat = `@echo off
cd /d "%~dp0"
node "${toWindowsPath(appDir)}\\dist\\index.js"
`;
fs.writeFileSync(path.join(dataDir, "run.bat"), runBat);

console.log(`Created launchers at ${dataDir}/run.sh and ${dataDir}/run.bat`);
