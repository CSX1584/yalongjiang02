#!/bin/zsh
cd "$(dirname "$0")"
if curl -fsS http://127.0.0.1:5273/ >/dev/null; then
  open 'http://127.0.0.1:5273/'
else
  open 'http://127.0.0.1:5273/'
  node server.mjs
fi
