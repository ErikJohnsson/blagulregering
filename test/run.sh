#!/usr/bin/env bash
# Kör end-to-end-testerna i test/logic-test.html med headless Chrome och skriver PASS/FAIL per test.
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[[ -x "$CHROME" ]] || { echo "Hittar inte Chrome: $CHROME (sätt CHROME=...)" >&2; exit 1; }
node --check ../script.js && node --check ../data.js
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=15000 \
  --dump-dom "file://$PWD/logic-test.html" 2>/dev/null \
| grep -o 'RESULTS.*' | sed 's/^RESULTS//' | python3 -c '
import sys, json, html
raw = sys.stdin.read().split("</pre>")[0]
r = json.loads(html.unescape(raw))
for x in r:
    print(("PASS" if x["pass"] else "FAIL"), "|", x["name"], ("| " + x["info"]) if (not x["pass"] and x["info"]) else "")
n = sum(x["pass"] for x in r)
print(); print(n, "/", len(r), "passed")
sys.exit(0 if n == len(r) else 1)'
