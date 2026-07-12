#!/usr/bin/env bash
# Copy this into your data directory, then set APP_DIR to where this app
# is installed. The app reads its data directory from cwd, so it must be
# launched from here (see docs/adr/0001-local-only-per-instance.md).
set -euo pipefail
cd "$(dirname "$0")"
APP_DIR="/path/to/hsa-expense-tracker"
exec node "$APP_DIR/dist/index.js"
