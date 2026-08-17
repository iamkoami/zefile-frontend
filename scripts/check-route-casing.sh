#!/usr/bin/env bash
#
# Route-casing regression guard — story 145.12
# ============================================================================
#
# WHAT THIS PROTECTS
#
# Short codes are CASE-SENSITIVE. Both `Transfers` and `FileRequests` look them
# up with `where: { shortCode }` — a TypeORM `=` match — and both draw from one
# mixed-case alphabet in which 99.68% of generated 10-character codes contain
# at least one uppercase letter (measured: 64 of 64 rows in the dev database).
#
# middleware.ts lowercases mixed-case paths so app routes are case-insensitive.
# If that redirect fires on a path carrying a short code, the code is destroyed
# and the visitor gets a "this transfer has vanished" page.
#
# That has now happened TWICE, and each time the guard that was supposed to
# prevent it was the thing that missed:
#
#   2026-07-29  the guard only matched /z-AbC at the ROOT, missing every route
#               carrying the code in a later segment.       (fixed, commit 4bac485)
#   2026-08-17  the guard tested `pathname.startsWith('/downloads/')`, which is
#               false for `/fr/downloads/...` — so the ENTIRE French download
#               surface 404'd. `/deliver/` was also never in the list at all,
#               breaking in English too.                    (fixed, story 145.12)
#
# Neither was caught by types, lint, `next build`, or `build:cloudflare`. The
# broken page returns **HTTP 200** with French "vanished" copy, so no status-code
# monitoring would ever have flagged it either. This script is the only thing in
# the repository that can tell the difference.
#
# WHY A SHELL SCRIPT AND NOT A TEST FRAMEWORK
#
# Deliberate. zefile-frontend has no test runner and CLAUDE.md says it stays that
# way. This runs the REAL middleware over HTTP instead of unit-testing a copy of
# its logic — the same shape as ci-verify-native-modules.sh in zefile-backend.
#
# USAGE
#
#   npm run build && npm start &
#   ./scripts/check-route-casing.sh                 # defaults to localhost:3000
#   BASE_URL=http://localhost:3001 ./scripts/check-route-casing.sh
#
# Exits non-zero on the first failing assertion, naming the row.
# ============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-120}"

# Synthetic codes. These need not exist in any database: the middleware makes
# its redirect decision from the path alone, before anything is looked up. That
# is what lets this run in CI with no database and no backend API.
UUID="00000000-0000-0000-0000-000000000000"
CODE="jT6Qx4VLRQ"      # mixed case, the shape the generator actually emits
LOWER_CODE="jt6qx4vlrq"

PASS=0
FAIL=0
FAILED_ROWS=()

# ---------------------------------------------------------------------------
# Wait for the server. A script that curls a dead port sees every request fail
# and — if it only asserted "this must not be a 308" — would report success
# forever. The preflight below is what makes that impossible.
# ---------------------------------------------------------------------------
wait_for_server() {
  local waited=0 code
  printf 'Waiting for %s (timeout %ss)...\n' "$BASE_URL" "$STARTUP_TIMEOUT"
  while [ "$waited" -lt "$STARTUP_TIMEOUT" ]; do
    # "Answers at all" is the readiness condition — NOT "answers 2xx". A dev
    # server compiling the home page on first hit can take far longer than a
    # short probe timeout, and a 500 still proves the port is live. Using
    # `curl -f` with a 5s budget here made this script report a running server
    # as dead, which is a false RED — the one failure mode a guard must not have.
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$BASE_URL/" 2>/dev/null)"
    if [ -n "$code" ] && [ "$code" != "000" ]; then
      printf 'Server is up after %ss (GET / -> %s).\n\n' "$waited" "$code"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  printf '\nFATAL: %s did not respond within %ss.\n' "$BASE_URL" "$STARTUP_TIMEOUT"
  printf 'Not reporting the routing assertions as passed — they were never run.\n'
  exit 1
}

# Returns "<status> <redirect_url>"
probe() {
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 "$BASE_URL$1"
}

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# ---------------------------------------------------------------------------
# assert_no_lowercase <path> <description>
#
#   The path carries a short code. It must NOT be redirected to its lowercased
#   form. Any other response — 200, 404, even 500 — is acceptable here: this
#   guard owns the ROUTING decision, not what the page then does with it.
#
#   Deliberately narrow. Asserting "not a 3xx" would make this script fail on
#   unrelated redirects that have nothing to do with casing.
# ---------------------------------------------------------------------------
assert_no_lowercase() {
  local path="$1" desc="$2"
  local result status redirect expected_bad
  result="$(probe "$path")"
  status="${result%% *}"
  redirect="${result#* }"
  expected_bad="$(lower "$path")"

  if [ "$status" = "000" ]; then
    printf '  FAIL  %-58s no response (server gone?)\n' "$path"
    FAILED_ROWS+=("$path — no response: $desc")
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$status" = "308" ] || [ "$status" = "301" ] || [ "$status" = "302" ]; then
    case "$redirect" in
      *"$expected_bad")
        printf '  FAIL  %-58s %s -> %s\n' "$path" "$status" "$redirect"
        printf '        the short code was lowercased; this is the 145.12 defect\n'
        FAILED_ROWS+=("$path — lowercased to $redirect: $desc")
        FAIL=$((FAIL + 1))
        return
        ;;
    esac
  fi

  printf '  ok    %-58s %s\n' "$path" "$status"
  PASS=$((PASS + 1))
}

# ---------------------------------------------------------------------------
# assert_lowercased <path> <description>
#
#   CONTROL. The path carries NO short code, so case normalisation must still
#   happen. These rows are the reason this script can tell a fix from a
#   sledgehammer: making `carriesShortCode` unconditionally true for /fr/*
#   would satisfy every assert_no_lowercase above while silently killing
#   case-insensitive routing for the whole French site.
# ---------------------------------------------------------------------------
assert_lowercased() {
  local path="$1" desc="$2"
  local result status redirect want
  result="$(probe "$path")"
  status="${result%% *}"
  redirect="${result#* }"
  want="$(lower "$path")"

  if [ "$status" != "308" ]; then
    printf '  FAIL  %-58s expected 308, got %s\n' "$path" "$status"
    printf '        case normalisation has been disabled: %s\n' "$desc"
    FAILED_ROWS+=("$path — expected 308, got $status: $desc")
    FAIL=$((FAIL + 1))
    return
  fi

  case "$redirect" in
    *"$want")
      printf '  ok    %-58s 308 -> %s\n' "$path" "$redirect"
      PASS=$((PASS + 1))
      ;;
    *)
      printf '  FAIL  %-58s 308 -> %s (expected to end %s)\n' "$path" "$redirect" "$want"
      FAILED_ROWS+=("$path — redirected to $redirect, expected $want")
      FAIL=$((FAIL + 1))
      ;;
  esac
}

# ---------------------------------------------------------------------------
# assert_middleware_covers <path> <description>
#
#   POSITIVE proof that the middleware actually EXECUTED on this path, by
#   requiring the Content-Security-Policy header it sets on every response it
#   handles.
#
#   Why this exists — found at G3 review, and it is the subtle one.
#
#   Every assertion above is an ABSENCE check ("was not lowercased"), and a
#   route the middleware never runs on passes all of them perfectly. Narrowing
#   `config.matcher` to drop ONE family — a one-line regex edit, on the exact
#   file this project has now broken twice — silently removes casing
#   protection, these security headers AND the platform-status gate from that
#   family, and the guard reported 12/12 green.
#
#   Reproduced before this was added: excluding only `deliver` from the matcher
#   left `/deliver/*` with no CSP header at all and the suite still exited 0.
#   The three CONTROL rows could not catch it because they are all `/About`-ish
#   paths — none of them belongs to the excluded family.
#
#   The compound case (dropping `/fr/*` too) WAS already caught, because `/fr`
#   has no physical `app/fr/` route and its controls 404 instead of 308. That
#   near-miss is precisely why the single-family case needs its own assertion:
#   the cheaper mistake was the undetected one.
# ---------------------------------------------------------------------------
assert_middleware_covers() {
  local path="$1" desc="$2"
  local headers
  headers="$(curl -s -o /dev/null -D - --max-time 30 "$BASE_URL$path" 2>/dev/null)"

  if printf '%s' "$headers" | grep -qi '^content-security-policy:'; then
    printf '  ok    %-58s middleware ran\n' "$path"
    PASS=$((PASS + 1))
  else
    printf '  FAIL  %-58s NO Content-Security-Policy header\n' "$path"
    printf '        middleware did not run here — check config.matcher. This route\n'
    printf '        has lost casing protection AND its security headers: %s\n' "$desc"
    FAILED_ROWS+=("$path — middleware not executing (no CSP header): $desc")
    FAIL=$((FAIL + 1))
  fi
}

# ===========================================================================

wait_for_server

# --- PREFLIGHT -------------------------------------------------------------
# Prove the middleware is running and CAN redirect before trusting a single
# negative assertion. Without this, a server that 500s on everything, or a
# matcher that stopped covering these paths, would read as "nothing was
# lowercased" — a perfect score for a completely broken deployment.
printf 'Preflight: confirming the casing redirect is alive at all...\n'
preflight="$(probe "/About")"
if [ "${preflight%% *}" != "308" ]; then
  printf 'FATAL: /About returned "%s", expected a 308 to /about.\n' "$preflight"
  printf 'The middleware is not running, or its matcher no longer covers these paths.\n'
  printf 'Every "not lowercased" assertion below would pass vacuously. Aborting.\n'
  exit 1
fi
printf 'Preflight OK — middleware is live and redirecting.\n\n'

printf 'AC1 — French paths carrying a short code must NOT be lowercased\n'
assert_no_lowercase "/fr/downloads/$UUID/$CODE" "FR download page (the reported defect)"
assert_no_lowercase "/fr/r/$CODE"               "FR short-review route"
assert_no_lowercase "/fr/review/$CODE"          "FR review page"

printf '\nAC2 — /deliver carries a FileRequest code, in BOTH locales\n'
assert_no_lowercase "/deliver/$CODE"            "file-request delivery page (EN)"
assert_no_lowercase "/fr/deliver/$CODE"         "file-request delivery page (FR)"

printf '\nAC4 — non-French code-bearing routes are unchanged\n'
assert_no_lowercase "/downloads/$UUID/$CODE"    "EN download page"
assert_no_lowercase "/r/$CODE"                  "EN short-review route"
assert_no_lowercase "/review/$CODE"             "EN review page"
assert_no_lowercase "/z-$CODE"                  "root short link keeps its z- prefixed code"

printf '\nAC3 — CONTROLS: case normalisation still works everywhere else\n'
assert_lowercased "/About"      "plain English app route"
assert_lowercased "/fr/About"   "French app route — the row that catches an over-broad fix"
assert_lowercased "/fr/Pricing" "French app route, second sample"

printf '\nAC5 — COVERAGE: the middleware actually runs on every code-bearing family\n'
assert_middleware_covers "/downloads/$UUID/$CODE" "EN download page"
assert_middleware_covers "/r/$CODE"               "EN short-review route"
assert_middleware_covers "/review/$CODE"          "EN review page"
assert_middleware_covers "/deliver/$CODE"         "file-request delivery page"
assert_middleware_covers "/fr/downloads/$UUID/$CODE" "FR download page"
assert_middleware_covers "/fr/deliver/$CODE"      "FR file-request delivery page"

printf '\n---------------------------------------------------------------\n'
if [ "$FAIL" -eq 0 ]; then
  printf 'check-route-casing: OK — %s assertions passed\n' "$PASS"
  exit 0
fi

printf 'check-route-casing: FAILED — %s passed, %s failed\n\n' "$PASS" "$FAIL"
printf 'Failing rows:\n'
for row in "${FAILED_ROWS[@]}"; do
  printf '  - %s\n' "$row"
done
printf '\nSee the header of this file and story 145.12 for what this guard protects.\n'
exit 1
