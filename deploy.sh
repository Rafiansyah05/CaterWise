#!/bin/bash
set -e

echo "=== [1/3] Menarik perubahan terbaru dari Git... ==="
git pull origin main

echo "=== [2/3] Membangun dan menjalankan kontainer Docker... ==="
docker compose up --build -d

echo "=== [3/3] Membersihkan kontainer/image lama yang tidak terpakai... ==="
docker image prune -f

echo "=== ✅ Deployment Berhasil! ==="
