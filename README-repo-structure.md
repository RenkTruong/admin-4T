# 4T monorepo - admin, customer, API

## Cấu trúc repo

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
│   │   └── frontend admin source
│   ├── customer/
│   │   └── frontend customer source
│   └── api/
│       └── backend API source
├── README.md
└── README-deploy.md
```

## Domain production chuẩn hóa

- Admin: https://admin.4t-laundry.com
- Customer: https://customer.4t-laundry.com
- API: https://api.4t-laundry.com

## Biến môi trường

File [.env.production.example](.env.production.example) chứa biến môi trường mẫu cho production. Không commit file `.env` thật lên GitHub.

## Deploy

```bash
docker compose up --build -d
```

## Quy tắc an toàn

- Không commit `.env` thật
- Không commit cert/private key
- Chỉ lưu secret trong GitHub Actions Secrets hoặc server runtime
- CORS chỉ cho phép origin của admin và customer
