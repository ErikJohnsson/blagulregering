#!/usr/bin/env bash
# Laddar upp de publika filerna till Loopia via FTP över TLS med lftp.
#
# Användning:
#   LOOPIA_USER='konto@loopia' LOOPIA_PASS='...' ./deploy.sh
#
# Valfritt: LOOPIA_HOST (standard ftpcluster.loopia.se), LOOPIA_DIR (standard public_html)
# Uppgifterna hittar du i Loopia Kundzon under Webbhotell > FTP-konton.
set -euo pipefail
cd "$(dirname "$0")"

: "${LOOPIA_USER:?Sätt LOOPIA_USER}"
: "${LOOPIA_PASS:?Sätt LOOPIA_PASS}"
HOST="${LOOPIA_HOST:-ftpcluster.loopia.se}"
DIR="${LOOPIA_DIR:-public_html}"

FILES=(index.html style.css script.js data.js favicon.svg apple-touch-icon.png og-image.png robots.txt sitemap.xml .htaccess)
for f in "${FILES[@]}"; do [[ -f "$f" ]] || { echo "Saknar $f" >&2; exit 1; }; done

node --check script.js && node --check data.js

lftp -u "$LOOPIA_USER","$LOOPIA_PASS" "ftp://$HOST" <<LFTP
set ftp:ssl-force true
set ssl:verify-certificate yes
cd $DIR
mput ${FILES[*]}
bye
LFTP
echo "Klart: https://blagulregering.se"
