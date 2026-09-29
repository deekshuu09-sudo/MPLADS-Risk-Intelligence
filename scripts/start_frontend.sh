#!/usr/bin/env bash
# Starts Vite React Frontend on port 5173
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Starting MPLADS Frontend (Vite) on http://localhost:5173 ==="
cd "${ROOT_DIR}/frontend"
npm run dev -- --host 0.0.0.0
