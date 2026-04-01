#!/bin/sh
set -e
cd /app/server
node index.mjs &
# Breve espera para que Express esté escuchando antes de nginx
i=0
while [ "$i" -lt 50 ]; do
  if wget -q -O /dev/null --timeout=1 http://127.0.0.1:3000/api/chat/tree 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 0.1
done
exec nginx -g "daemon off;"
