#!/bin/bash
set -e

echo "=== [1/4] Menarik perubahan terbaru dari Git... ==="
git pull origin main

echo "=== [2/4] Membangun kontainer API (Berurutan agar tidak berebut bandwidth)... ==="
docker compose build api

echo "=== [3/4] Membangun kontainer Web... ==="
docker compose build web

echo "=== [4/4] Menjalankan kontainer dan membersihkan image lama... ==="
docker compose up -d
docker image prune -f

echo "=== ✅ Deployment Berhasil! ==="
