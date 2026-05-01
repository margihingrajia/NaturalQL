#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
pip install -r requirements.txt --quiet

echo "🚀 Starting NaturalQL backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
