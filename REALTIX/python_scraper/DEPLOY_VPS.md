# Deployment scraper 999.md pe VPS Linux

Checklist condensat pentru un VPS Ubuntu 22.04+ cu SSH root. Toate comenzile
presupun că `realtix` rulează la `/var/www/realtix` cu user `www-data`.

## 1. Dependențe sistem

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv firefox-esr xvfb \
                    postgresql-client cron
```

`firefox-esr` e versiunea LTS — mai stabilă pentru Selenium decât Firefox normal.

## 2. geckodriver

```bash
GECKO_VER=v0.34.0   # check https://github.com/mozilla/geckodriver/releases
cd /tmp
wget https://github.com/mozilla/geckodriver/releases/download/${GECKO_VER}/geckodriver-${GECKO_VER}-linux64.tar.gz
tar -xzf geckodriver-${GECKO_VER}-linux64.tar.gz
sudo mv geckodriver /usr/local/bin/
sudo chmod +x /usr/local/bin/geckodriver
geckodriver --version
```

## 3. venv Python pentru scraper

```bash
cd /var/www/realtix/python_scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

În `.env` setează:

```
PYTHON_BIN=/var/www/realtix/python_scraper/.venv/bin/python
```

## 4. Cron-ul Laravel

```bash
sudo crontab -u www-data -e
```

Adaugă:

```cron
* * * * * cd /var/www/realtix && php artisan schedule:run >> storage/logs/schedule.log 2>&1
```

Verifică:

```bash
sudo -u www-data php /var/www/realtix/artisan schedule:list
```

## 5. Queue worker (jobs Laravel, NU scraper-ul)

CLAUDE.md spune: `QUEUE_CONNECTION=database`. Pentru ca job-urile (notificări,
AI valuation, etc.) să ruleze trebuie un worker permanent.

Creează `/etc/systemd/system/realtix-queue.service`:

```ini
[Unit]
Description=REALTIX queue worker
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
Restart=always
RestartSec=3
WorkingDirectory=/var/www/realtix
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-time=3600
StandardOutput=append:/var/log/realtix-queue.log
StandardError=append:/var/log/realtix-queue.log

[Install]
WantedBy=multi-user.target
```

Pornește:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now realtix-queue
sudo systemctl status realtix-queue
```

## 6. Permisiuni storage (imagini scrape-uite local)

```bash
sudo chown -R www-data:www-data /var/www/realtix/storage
sudo chmod -R 775 /var/www/realtix/storage/app/public/scraped
```

`storage/app/public/scraped/{id}/` va crește cu ~50-200 KB / anunț. Pentru
3000 anunțuri ≈ 300-600 MB. Pune un log-rotate / housekeeping dacă VPS-ul are
disk limitat.

## 7. Test inițial

```bash
sudo -u www-data php /var/www/realtix/artisan portal:999:scrape --pages=1 --max-ads=5
```

Trebuie să vezi 3-5 anunțuri în tabela `scraped_listings` în câteva minute.
Imaginile ajung în `storage/app/public/scraped/<id>/`.

## 8. Monitor

```bash
# Log-ul scheduler-ului
tail -f /var/www/realtix/storage/logs/schedule.log

# Log-ul queue
tail -f /var/log/realtix-queue.log

# Errori Laravel
tail -f /var/www/realtix/storage/logs/laravel.log
```

## 9. Plafon zilnic — 200 anunțuri unice / zi

Scheduler-ul Laravel garantează acest plafon prin două mecanisme combinate:

| Mecanism | Detaliu |
|---|---|
| **Frecvență redusă** | 4 rulări/zi la `00 / 06 / 12 / 18` + un top-up la `22:00` |
| **`--max-ads=50` per rulare** | Python oprește la 50 anunțuri procesate / rulare |
| **Circuit breaker** | `->when(...)` în [console.php](../routes/console.php) verifică `COUNT(scraped_listings WHERE source='999md' AND created_at::date = today)` și sare peste rulare dacă deja ≥ 200 |

Astfel, chiar dacă 999.md ar publica brusc 1000 de anunțuri într-o oră, intră
maxim 200 în DB pe ziua respectivă. Rulările suplimentare se loghează ca skipped
și nu apelează Python.

**Verifică plafonul:**
```bash
sudo -u www-data php artisan tinker --execute='echo "Azi: ".DB::table("scraped_listings")->where("source","999md")->whereDate("created_at",today())->count();'
```

**Schimbă plafonul** (dacă vrei alt număr): editează în [routes/console.php](../routes/console.php) constanta `200` din `$dailyCapHit`.

## 10. Limite cunoscute pe VPS mic

- **RAM**: Firefox + Selenium consumă ~500-700 MB / instanță. Recomand min. 2 GB RAM.
- **Display**: scraper-ul rulează headless — Xvfb e setup-uit dar nefolosit (Firefox `-headless` direct).
- **Network**: 999.md poate rate-limita IP-uri agresive. `sleep(1)` între pagini e deja inclus.
- **Rotație IP**: dacă scraper-ul prinde 429 / 503 consecutiv, rotește IP-ul sau adăugă proxy.
