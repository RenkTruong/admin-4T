# 4T Monorepo

This repository contains the production deployment structure for three separate services:

- Admin frontend
- Customer frontend
- API backend

## Production domains

- Admin: https://admin.4t-laundry.com
- Customer: https://customer.4t-laundry.com
- API: https://api.4t-laundry.com

## Repository structure

```text
4T/
├── .github/
│   └── workflows/
│       ├── deploy-admin.yml
│       ├── deploy-customer.yml
│       └── deploy-production.yml
├── .gitignore
├── .env.production.example
├── docker-compose.yml
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
├── apps/
│   ├── admin/
│   ├── customer/
│   └── api/
├── README.md
└── README-deploy.md
```

## Environment setup

Copy the example environment file and replace the values before production deployment:

```bash
cp .env.production.example .env
```

Then update:

- database credentials
- admin credentials
- secret token
- domain values
- CORS origin values

## Start with Docker Compose

```bash
docker compose up --build -d
```

## Frontend build config

The frontend apps should set:

```env
VITE_API_BASE_URL=https://api.4t-laundry.com
```

## API CORS config

The API must allow only trusted origins:

```env
ADMIN_ORIGIN=https://admin.4t-laundry.com
CUSTOMER_ORIGIN=https://customer.4t-laundry.com
CORS_ORIGIN=https://admin.4t-laundry.com,https://customer.4t-laundry.com
```

## Security notes

- Never commit real `.env` files
- Never commit private keys or certificates
- Keep secrets in GitHub Actions secrets or on the server
- Use HTTPS in production

## Deploy

- Push to `main` to trigger workflow deployment
- Or run the workflow manually from GitHub Actions
