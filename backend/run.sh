#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f out/Main.class ] || [ ! -f lib/gson.jar ]; then
  echo "Compiled classes were not found. Run ./setup.sh first."
  exit 1
fi

if [ "${1:-}" = "test" ]; then
  exec java -cp "out:lib/*" Main test
fi

echo "Local checks work without an API key."
echo "For AI review, set GROQ_API_KEY and optionally GROQ_MODEL first."
echo "Default model: openai/gpt-oss-120b"
exec java -cp "out:lib/*" Main
