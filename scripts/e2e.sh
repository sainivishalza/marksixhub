#!/usr/bin/env bash
# Runs every browser test against a real local database, in an order that works: each suite gets a fresh database and a freshly started
# server unless it must continue the previous suite's data. Takes about 25 minutes.
#
# Needs: MariaDB/MySQL running with a root-capable `mariadb` command, a user for the app (see below), `npm install` done, and a browser:
#   npx playwright install chromium     (or set CHROMIUM_PATH to an existing Chromium)
# Usage:  npm run e2e            runs everything
#         npm run e2e -- 14 16   runs only suites 14 and 16
set -u
cd "$(dirname "$0")/.."
export E2E_DB="${E2E_DB:-mh_test}"
export DB_HOST="${DB_HOST:-127.0.0.1}" DB_NAME="$E2E_DB" DB_USER="${DB_USER:-mh}" DB_PASS="${DB_PASS:-mhpass}"
export SESSION_SECRET="${SESSION_SECRET:-0123456789abcdef0123456789abcdef0123}" BASE_URL=http://localhost:3333 PORT=3333 NODE_ENV=production
export ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=adminpass12345
[ -z "${CHROMIUM_PATH:-}" ] && [ -x /opt/pw-browsers/chromium ] && export CHROMIUM_PATH=/opt/pw-browsers/chromium
E=tests/e2e
SMTP_ENV=(SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_USER=info@marksixhub.com SMTP_PASS=secret "MAIL_FROM=Mark Six Hub <info@marksixhub.com>")

mariadb -e "CREATE DATABASE IF NOT EXISTS \`$E2E_DB\` CHARACTER SET utf8mb4; GRANT ALL ON \`$E2E_DB\`.* TO '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; GRANT ALL ON \`$E2E_DB\`.* TO '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';" || { echo "Cannot reach MariaDB as root."; exit 2; }
[ "${SKIP_BUILD:-0}" = 1 ] || npm run build >/dev/null 2>&1 || { echo "Build failed"; exit 2; }

fresh() { mariadb -e "DROP DATABASE IF EXISTS \`$E2E_DB\`; CREATE DATABASE \`$E2E_DB\` CHARACTER SET utf8mb4;"; fuser -k 2525/tcp >/dev/null 2>&1; }
start() { # start [extra env...]: stop any server, start a new one, wait until it answers
  fuser -k 3333/tcp >/dev/null 2>&1; sleep 1
  (env "$@" node server.js >/tmp/e2e-app.log 2>&1 &)
  for _ in $(seq 1 60); do curl -s -o /dev/null http://localhost:3333/ && return 0; sleep 1; done
  echo "server did not start"; tail -n 20 /tmp/e2e-app.log; return 1
}
failed=0; ran=0
run() { # run <suite file> [extra env...]
  f="$1"; shift
  name="$(basename "$f" .mjs)"
  if [ "${#ONLY[@]}" -gt 0 ]; then case " ${ONLY[*]} " in *" ${name%%-*} "*) ;; *) return 0;; esac; fi
  out="$(env "$@" timeout 900 node "$f" 2>&1)"; code=$?
  line="$(echo "$out" | grep -E 'passed' | tail -1)"; bad="$(echo "$out" | grep -cE '^FAIL')"
  printf '%-28s %s %s\n' "$name" "${line:-NO RESULT (exit $code)}" "$([ "$bad" != 0 ] && echo "- $bad FAILED")"
  [ "$bad" != 0 ] && echo "$out" | grep -E '^FAIL' | head -5 | sed 's/^/    /'
  [ "$bad" != 0 ] || [ -z "$line" ] && failed=1
  ran=$((ran+1))
}
ONLY=("$@")

fresh; start NODE_ENV=production;                      run $E/01-core.mjs
start NODE_ENV=production;                             run $E/02-admin.mjs     # must follow 01 on the same data, on a fresh server
start NODE_ENV=production;                             run $E/03-submit-flow.mjs; run $E/06-receipts.mjs
for n in 04-checker 07-concurrency 13-reminders 14-transfers 15-error-alerts 16-invites-achievements 17-result-source; do
  fresh; start NODE_ENV=production;                    run $E/$n.mjs
done
fresh; start NODE_ENV=production; node $E/seed.mjs >/dev/null 2>&1; run $E/12-results-search.mjs
fresh; start GA_MEASUREMENT_ID=G-TEST12345;            run $E/10-legal-cookies.mjs GA_MEASUREMENT_ID=G-TEST12345
for n in 05-email-verify 08-order-emails; do
  fresh; start "${SMTP_ENV[@]}";                       run $E/$n.mjs "${SMTP_ENV[@]}"
done
fresh; start OPERATOR_NAME="Test Operator Ltd" OPERATOR_ADDRESS="1 Test Road, Hong Kong"; run $E/11-health-about.mjs OPERATOR_NAME="Test Operator Ltd" OPERATOR_ADDRESS="1 Test Road, Hong Kong"
fuser -k 3333/tcp >/dev/null 2>&1
echo; [ "$failed" = 0 ] && echo "All $ran suites passed." || echo "Some suites FAILED."
exit "$failed"
