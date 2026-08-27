#!/bin/bash
set -e

echo "=== [1/3] Menarik script terbaru dari Git... ==="
git pull origin main

echo "=== [2/3] Menarik Image Docker Terbaru dari Docker Hub... ==="
docker compose pull

echo "=== [3/3] Menjalankan Container... ==="
docker compose up -d --remove-orphans

echo "=== Selesai! Deployment aktif. ==="
