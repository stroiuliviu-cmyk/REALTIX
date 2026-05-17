#!/usr/bin/env bash
# Forge deployment script pentru REALTIX
# Acest script rulează automat la fiecare push pe branch-ul main (dacă Quick Deploy e activ)

set -e  # exit pe orice eroare

cd /home/forge/realtix.md

echo "════════════════════════════════════════════"
echo "REALTIX deploy started at $(date)"
echo "════════════════════════════════════════════"

# 1. Git pull
git pull origin main

# 2. Composer install (production)
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# 3. NPM install + build
npm ci
npm run build

# 4. Maintenance mode ON
php artisan down --message="Update în curs..." --retry=60 || true

# 5. Migrations
php artisan migrate --force

# 6. Storage link (idempotent)
php artisan storage:link || true

# 7. Cache everything
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 8. Restart queue workers (graceful)
php artisan queue:restart

# 9. Python scraper deps
if [ -d "python_scraper/venv" ]; then
    /home/forge/realtix.md/python_scraper/venv/bin/pip install -q -r python_scraper/requirements.txt
fi

# 10. Maintenance mode OFF
php artisan up

echo "════════════════════════════════════════════"
echo "REALTIX deploy completed at $(date)"
echo "════════════════════════════════════════════"
