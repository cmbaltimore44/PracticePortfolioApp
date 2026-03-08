#!/bin/bash
# Start Docker services
docker compose up -d

# Start Backend
source backend/.venv/bin/activate
uvicorn backend.main:app --reload --port 8000
