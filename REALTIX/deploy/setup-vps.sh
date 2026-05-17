#!/usr/bin/env bash
# Setup inițial VPS Hetzner pentru REALTIX
# Rulează ca root, o singură dată, după ce Forge a provisioning-uit serverul

set -e

echo "Installing Firefox + geckodriver for Selenium..."

apt update
apt install -y firefox-esr xvfb python3.12-venv

# Geckodriver
GECKODRIVER_VERSION="v0.36.0"
wget -q "https://github.com/mozilla/geckodriver/releases/download/${GECKODRIVER_VERSION}/geckodriver-${GECKODRIVER_VERSION}-linux64.tar.gz"
tar -xzf "geckodriver-${GECKODRIVER_VERSION}-linux64.tar.gz" -C /usr/local/bin/
chmod +x /usr/local/bin/geckodriver
rm "geckodriver-${GECKODRIVER_VERSION}-linux64.tar.gz"

echo "Geckodriver installed at: $(which geckodriver)"
geckodriver --version

echo "Firefox version:"
firefox-esr --version

# Python venv pentru scraper
cd /home/forge/realtix.md/python_scraper
sudo -u forge python3 -m venv venv
sudo -u forge venv/bin/pip install --upgrade pip
sudo -u forge venv/bin/pip install -r requirements.txt

echo "Python scraper deps installed."

# Optional: instalează postgres client tools pentru backup
apt install -y postgresql-client-17

echo "════════════════════════════════════════════"
echo "VPS setup completed."
echo "Next steps:"
echo "1. Paste .env production în Forge UI"
echo "2. Trigger Deploy în Forge"
echo "3. Verify: curl https://realtix.md/health"
echo "════════════════════════════════════════════"
