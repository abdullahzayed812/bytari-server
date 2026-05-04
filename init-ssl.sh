#!/bin/bash
# Run once on the server to bootstrap SSL.
# After this, `docker compose up` works normally forever.

set -e

DOMAIN="bytari.vet"
EMAIL="zuhairalrawi0@gmail.com"
CERT_PATH="./nginx/certbot/conf/live/$DOMAIN"

# Create a dummy self-signed cert so nginx can start before the real cert exists
if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
  echo "Creating dummy cert so nginx can start..."
  mkdir -p "$CERT_PATH"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_PATH/privkey.pem" \
    -out "$CERT_PATH/fullchain.pem" \
    -subj "/CN=$DOMAIN" 2>/dev/null
fi

# Start nginx and the rest of the stack
docker compose up -d

# Replace dummy cert with real one from Let's Encrypt
echo "Requesting real SSL certificate..."
docker compose run --rm certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email \
  --force-renewal

# Reload nginx to use the real cert
docker compose exec nginx nginx -s reload

echo "Done. https://$DOMAIN is live."
