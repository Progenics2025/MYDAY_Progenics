#!/usr/bin/env bash
set -euo pipefail

# Simple helper to start a Cloudflare tunnel pointing to local server port.
# Usage:
#   ./scripts/run-cloudflared.sh           # prompts for options
#   ./scripts/run-cloudflared.sh --port 5000 --name myday-tunnel
#   ./scripts/run-cloudflared.sh --url http://localhost:5000

PORT=5000
TUNNEL_NAME=""
URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"; shift 2;;
    --name)
      TUNNEL_NAME="$2"; shift 2;;
    --url)
      URL="$2"; shift 2;;
    --help)
      echo "Usage: $0 [--port 5000] [--name tunnel-name] [--url http://localhost:5000]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -z "$URL" ]]; then
  URL="http://localhost:${PORT}"
fi

# Verify cloudflared is available
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Please install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
  exit 2
fi

# If a tunnel name is provided, try to run tunnel by name
if [[ -n "$TUNNEL_NAME" ]]; then
  echo "Starting named tunnel '${TUNNEL_NAME}' forwarding to ${URL}"
  exec cloudflared tunnel run "$TUNNEL_NAME"
else
  echo "Starting ephemeral tunnel to ${URL} (press Ctrl-C to stop)"
  exec cloudflared tunnel --url "$URL"
fi
