#!/usr/bin/env bash
# Runs automated test suites for MPLADS Risk Intelligence Platform
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Running Backend Pytest Suite ==="
cd "${ROOT_DIR}"
PYTHONPATH=backend backend/venv/bin/pytest tests/backend -v
