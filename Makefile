.PHONY: all test build backend frontend clean help

help:
	@echo "MPLADS Risk Intelligence Platform - Available Targets:"
	@echo "  make test      - Run automated Pytest suite"
	@echo "  make build     - Build frontend production bundle & compile backend"
	@echo "  make backend   - Start FastAPI backend server on http://localhost:8000"
	@echo "  make frontend  - Start Vite frontend dev server on http://localhost:5173"
	@echo "  make clean     - Clean temporary Python and test caches"

test:
	./scripts/run_tests.sh

build:
	./scripts/build.sh

backend:
	./scripts/start_backend.sh

frontend:
	./scripts/start_frontend.sh

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	rm -rf .pytest_cache .coverage
