#!/usr/bin/env bash
# Rehearses what Hostinger does on every deploy, in a throw-away copy: a production install (devDependencies skipped)
# whose postinstall runs `next build --webpack`, once normally and once with the --legacy-peer-deps retry Hostinger falls back to.
# Run it before merging to main: `npm run check:deploy`. Takes a couple of minutes. Exit code 0 = safe to deploy.
set -u
cd "$(dirname "$0")/.."
export BASE_URL="${BASE_URL:-https://marksixhub.com}" SESSION_SECRET="${SESSION_SECRET:-0123456789abcdef0123456789abcdef0123}" NODE_ENV=production
fail=0
for mode in "" "--legacy-peer-deps"; do
  dir="$(mktemp -d)"
  git ls-files -z --cached --others --exclude-standard | xargs -0 -I{} cp --parents {} "$dir"/ 2>/dev/null
  echo "== npm install ${mode:-(normal)} in a clean production copy"
  if (cd "$dir" && npm install $mode >"$dir/install.log" 2>&1) && [ -f "$dir/.next/BUILD_ID" ]; then
    echo "   ok: build finished"
  else
    echo "   FAILED. Last lines of the log:"; tail -n 25 "$dir/install.log" | sed 's/^/   | /'
    fail=1
  fi
  rm -rf "$dir"
done
[ "$fail" = 0 ] && echo "Deploy rehearsal passed." || echo "Deploy rehearsal FAILED: do not merge to main."
exit "$fail"
