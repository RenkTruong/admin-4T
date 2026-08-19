# Production deployment notes

## 1. Copy environment file

```bash
cp .env.production.example .env
```

Fill in production values for:
- POSTGRES_DB
- POSTGRES_USER
- POSTGRES_PASSWORD
- ADMIN_USERNAME
- ADMIN_PASSWORD
- SYNC_TOKEN
- CERTBOT_EMAIL
- ADMIN_DOMAIN
- CUSTOMER_DOMAIN
- API_DOMAIN

## 2. Build and start

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## 3. Obtain SSL certificates

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos --no-eff-email \
  -d admin.example.com -d customer.example.com -d api.example.com
```

## 4. Restart nginx

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

## 5. Validate

- https://admin.example.com
- https://customer.example.com
- https://api.example.com/api/health

## Notes

- Replace example domains with actual production domains.
- Make sure your DNS records point to the server IP.
- Keep the database password and admin password out of source control.
