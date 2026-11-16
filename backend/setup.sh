#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v java >/dev/null 2>&1 || ! command -v javac >/dev/null 2>&1; then
  echo "Java 21 is required, but java or javac was not found."
  exit 1
fi

major="$(java -version 2>&1 | awk -F'[".]' '/version/ { if ($2 == "1") print $3; else print $2; exit }')"
echo "Found Java ${major}."
if [ "${major}" -lt 21 ]; then
  echo "Java 21 or newer is required."
  exit 1
fi

mkdir -p lib out

if [ ! -f lib/gson.jar ]; then
  echo "Downloading Gson 2.15.0 from Maven Central..."
  curl -fsSL -o lib/gson.jar \
    "https://repo1.maven.org/maven2/com/google/code/gson/gson/2.15.0/gson-2.15.0.jar"
fi

if ! jar tf lib/gson.jar >/dev/null 2>&1; then
  echo "The Gson file is not a valid JAR. Remove backend/lib/gson.jar and run setup again."
  exit 1
fi

echo "Compiling Java sources..."
javac -cp "lib/*" -d out src/*.java
echo "Build successful. Start the server with ./run.sh"
