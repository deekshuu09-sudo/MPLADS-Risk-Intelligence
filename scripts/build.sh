#!/usr/bin/env bash
# Verifies build integrity across frontend and backend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Verifying Backend Python Bytecode ==="
backend/venv/bin/python3 -m compileall backend/app -q

echo "=== Building Frontend Production Bundle ==="
cd "${ROOT_DIR}/frontend"
npm run build

echo "=== All Builds Verified Successfully ==="
