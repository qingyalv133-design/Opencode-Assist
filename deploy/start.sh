#!/usr/bin/env bash
set -euo pipefail

mkdir -p /root/.local/share/opencode /root/.config/opencode /root/.cache/opencode
cp /app/models.json /root/.cache/opencode/models.json
cp /app/opencode.jsonc /root/.config/opencode/opencode.jsonc

if [ -n "${DEEPSEEK_API_KEY:-}" ]; then
  printf '{"deepseek":{"type":"api","key":"%s"}}\n' "$DEEPSEEK_API_KEY" > /root/.local/share/opencode/auth.json
fi

export OPENCODE_PASSWORD="${OPENCODE_PASSWORD:-opencode12345}"
echo "starting opencode server"
opencode serve --port 4096 --hostname 127.0.0.1 --print-logs --log-level info &
SERVER_PID=$!

for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4096/api/session || true)
  if [ "$CODE" = "401" ] || [ "$CODE" = "200" ]; then
    echo "opencode server ready ($CODE)"
    break
  fi
  sleep 1
done

echo "starting Assist proxy on port ${PORT:-8080}"
exec node /app/public-proxy.mjs
