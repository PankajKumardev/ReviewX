#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

mkdir -p lib out
if [ ! -f lib/gson.jar ]; then
    curl -fLsS "https://repo.maven.apache.org/maven2/com/google/code/gson/gson/2.15.0/gson-2.15.0.jar" -o lib/gson.jar.tmp
    mv lib/gson.jar.tmp lib/gson.jar
fi

javac -cp lib/gson.jar -d out src/reviewx/*.java
if [ "${1:-}" = "--java" ]; then
    exec java -cp "out:lib/gson.jar" reviewx.Main
fi

if [ ! -d frontend/node_modules/next ]; then
    npm --prefix frontend ci
fi

exec npm --prefix frontend run dev
