#!/bin/bash
# Prepares Claude Code cloud sessions: installs dependencies so dev server, checks, unit tests
# and Playwright work immediately. Local sessions are left alone.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# `npm install` (not `npm ci`) so the cached container keeps node_modules between sessions.
npm install --no-audit --no-fund --loglevel=error

# Playwright is pinned to the version matching the preinstalled Chromium in /opt/pw-browsers.
if [ -d /opt/pw-browsers ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers' >> "$CLAUDE_ENV_FILE"
  echo 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1' >> "$CLAUDE_ENV_FILE"
fi

# Generates content collection types so `astro check` works before the first dev run.
npx astro sync > /dev/null
