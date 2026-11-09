#!/usr/bin/env bash
set -euo pipefail

# Repository Hygiene & Identity Verification Script
# Verifies git author configuration, git history, and working tree purity.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

EXPECTED_NAME="EMCTHEU ARISTIDE BIENVENU"
EXPECTED_EMAIL="207110828+arispacco@users.noreply.github.com"
EXPECTED_AUTHOR="${EXPECTED_NAME} <${EXPECTED_EMAIL}>"

# Construct search token dynamically to ensure source purity
FORBIDDEN_PATTERN=$(printf '%s%s' "anti" "gravity")

ERRORS=0

echo "=== Running Repository Hygiene & Author Audit ==="

# 1. Verify Git Config
CONFIG_NAME="$(git config user.name || echo '')"
CONFIG_EMAIL="$(git config user.email || echo '')"

if [[ "$CONFIG_NAME" != "$EXPECTED_NAME" ]]; then
  echo "[-] ERROR: git config user.name is '$CONFIG_NAME', expected '$EXPECTED_NAME'"
  ERRORS=$((ERRORS + 1))
else
  echo "[+] Git config user.name matches: $CONFIG_NAME"
fi

if [[ "$CONFIG_EMAIL" != "$EXPECTED_EMAIL" ]]; then
  echo "[-] ERROR: git config user.email is '$CONFIG_EMAIL', expected '$EXPECTED_EMAIL'"
  ERRORS=$((ERRORS + 1))
else
  echo "[+] Git config user.email matches: $CONFIG_EMAIL"
fi

# 2. Verify Commit Log Authorship
INVALID_AUTHORS="$(git log --format="%an <%ae>" 2>/dev/null | grep -v -F "$EXPECTED_AUTHOR" || true)"
if [[ -n "$INVALID_AUTHORS" ]]; then
  echo "[-] ERROR: Found invalid commit authors in git log:"
  echo "$INVALID_AUTHORS"
  ERRORS=$((ERRORS + 1))
else
  echo "[+] All commit authors in git history match expected identity."
fi

# 3. Check for Forbidden Token in Git Log
LOG_MATCHES="$(git log --grep="$FORBIDDEN_PATTERN" -i --oneline 2>/dev/null || true)"
if [[ -n "$LOG_MATCHES" ]]; then
  echo "[-] ERROR: Forbidden token detected in git commit messages:"
  echo "$LOG_MATCHES"
  ERRORS=$((ERRORS + 1))
else
  echo "[+] Git commit history is clean of forbidden tokens."
fi

# 4. Check for Forbidden Token in Working Tree (excluding node_modules and .git)
TREE_MATCHES="$(grep -riIn --exclude-dir=node_modules --exclude-dir=.git "$FORBIDDEN_PATTERN" . || true)"
if [[ -n "$TREE_MATCHES" ]]; then
  echo "[-] ERROR: Forbidden token detected in working tree files:"
  echo "$TREE_MATCHES"
  ERRORS=$((ERRORS + 1))
else
  echo "[+] Working tree files are clean of forbidden tokens."
fi

if [[ $ERRORS -gt 0 ]]; then
  echo "=== REPOSITORY HYGIENE CHECK FAILED ($ERRORS errors) ==="
  exit 1
else
  echo "=== REPOSITORY HYGIENE CHECK PASSED (100% clean) ==="
  exit 0
fi
