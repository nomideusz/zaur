#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

pass() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

echo "Running verification against $BASE_URL"
echo "---"

# 1. GET /api/domains
HTTP=$(curl -s -o /tmp/domains.json -w "%{http_code}" "$BASE_URL/api/domains")
if [[ "$HTTP" == "200" ]]; then
  pass "GET /api/domains returns 200"
  DOMAINS=$(python3 -c "import json; d=json.load(open('/tmp/domains.json')); print(len(d.get('domains',[])))" 2>/dev/null || echo 0)
  echo "  Found $DOMAINS domain(s)"
elif [[ "$HTTP" == "502" ]]; then
  echo "⚠ GET /api/domains returned 502 (Stalwart not configured — skipping live domain tests)"
else
  fail "GET /api/domains returned $HTTP"
fi

# 2. GET /api/captcha
HTTP=$(curl -s -c "$COOKIE_JAR" -o /tmp/captcha.json -w "%{http_code}" "$BASE_URL/api/captcha")
[[ "$HTTP" == "200" ]] && pass "GET /api/captcha returns 200" || fail "GET /api/captcha returned $HTTP"

# 3. POST /api/check-username — reserved name
HTTP=$(curl -s -o /tmp/check-admin.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/check-username" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')
[[ "$HTTP" == "400" ]] && pass "Reserved username 'admin' rejected with 400" || fail "Reserved username check returned $HTTP"

# 4. POST /api/check-username — valid format
HTTP=$(curl -s -o /tmp/check-user.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/check-username" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123"}')
if [[ "$HTTP" == "200" ]]; then
  pass "Valid username check returns 200"
elif [[ "$HTTP" == "502" ]]; then
  echo "⚠ Username availability check returned 502 (Stalwart not configured)"
else
  fail "Username check returned $HTTP"
fi

# 5. POST /api/register — reserved username
HTTP=$(curl -s -o /tmp/reg-admin.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{"username":"admin","domainId":"x","password":"TestPass123!","confirmPassword":"TestPass123!","captchaAnswer":0}')
[[ "$HTTP" == "400" ]] && pass "Registration with reserved username rejected" || fail "Reserved registration returned $HTTP"

# 6. POST /api/register — weak password (will fail validation or Stalwart)
HTTP=$(curl -s -o /tmp/reg-weak.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{"username":"validuser99","domainId":"x","password":"short","confirmPassword":"short","captchaAnswer":0}')
[[ "$HTTP" == "400" ]] && pass "Weak/short password rejected" || fail "Weak password check returned $HTTP"

# 7. Landing page
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
[[ "$HTTP" == "200" ]] && pass "Landing page returns 200" || fail "Landing page returned $HTTP"

# 8. Register page
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/register")
[[ "$HTTP" == "200" ]] && pass "Register page returns 200" || fail "Register page returned $HTTP"

echo "---"
echo "Basic smoke tests passed."
echo ""
echo "Manual tests remaining:"
echo "  - End-to-end registration with valid Stalwart credentials"
echo "  - Rate limit: 6 registrations within 1 hour from same IP"
echo "  - Login at webmail with created account"
