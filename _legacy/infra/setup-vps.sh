#!/bin/bash
# VPS Setup Script for n8n
# Run on fresh Ubuntu 24.04 VPS as root or with sudo

set -euo pipefail

echo "=== Step 1: System update ==="
apt update && apt upgrade -y

echo "=== Step 2: Install essentials ==="
apt install -y curl ufw fail2ban git

echo "=== Step 3: Firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== Step 4: Install Docker ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

echo "=== Step 5: Create n8n user (optional, runs as root for simplicity) ==="
mkdir -p /opt/n8n
cd /opt/n8n

echo "=== Step 6: Generate encryption key ==="
ENCRYPTION_KEY=$(openssl rand -hex 32)
POSTGRES_PASS=$(openssl rand -base64 24)
N8N_PASS=$(openssl rand -base64 16)

echo ""
echo "=========================================="
echo "SAVE THESE CREDENTIALS NOW:"
echo "=========================================="
echo "N8N_BASIC_AUTH_USER=admin"
echo "N8N_BASIC_AUTH_PASSWORD=$N8N_PASS"
echo "N8N_ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "POSTGRES_PASSWORD=$POSTGRES_PASS"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy docker-compose.yml, Caddyfile, .env to /opt/n8n/"
echo "2. Update DNS A record: n8n.yourdomain.com -> $(curl -s ifconfig.me)"
echo "3. cd /opt/n8n && docker compose up -d"
echo "4. Wait 30s for SSL cert, then visit https://n8n.yourdomain.com"
