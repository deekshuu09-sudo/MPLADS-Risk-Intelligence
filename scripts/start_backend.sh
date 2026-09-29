#!/usr/bin/env bash
# Starts FastAPI Analytics & Risk Intelligence Service on port 8000
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Starting MPLADS Backend (FastAPI) on http://0.0.0.0:8000 ==="
cd "${ROOT_DIR}"
PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
