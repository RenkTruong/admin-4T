# 4T API & Backend Setup

This project includes a static frontend plus a backend API for real data access.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## 1) Install dependencies

```bash
cd API
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env` and adjust the values:

```bash
cp .env.example .env
```

Example:

```env
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/4t_db
DATABASE_SSL=false
CORS_ORIGIN=http://localhost:3000
API_BASE=http://localhost:4000
SYNC_TOKEN=change-this-token
ADMIN_USERNAME=admin4T
ADMIN_PASSWORD=123456
```

## 3) Create database and run schema

```bash
createdb 4t_db
psql -d 4t_db -f schema.sql
psql -d 4t_db -f seed-admin.sql
```

## 4) Start the API

```bash
cd API
npm run api
```

The API will run on:

```text
http://localhost:4000
```

## 5) Run localStorage migration to PostgreSQL

If you want to migrate the current demo/local browser data into the database:

```bash
cd API
npm run migrate
```

This script expects a file named `4t-export.json` in the API folder.

## 6) Run static frontend

Open the HTML files directly in a browser:

- `admin.html`
- `customer.html`

The frontend connects to the backend at `http://localhost:4000` by default.

## 7) Default admin account

- Username: `admin4T`
- Password: `123456`

## Useful endpoints

- `GET /api/health`
- `POST /api/admin/login`
- `GET /api/admins`
- `POST /api/admins`
- `PATCH /api/admins/:id`
- `PATCH /api/admins/:id/lock`
- `DELETE /api/admins/:id`
- `POST /api/customers/register`
- `POST /api/customers/login`
- `POST /api/orders`
- `GET /api/orders`
- `PATCH /api/orders/:id/status`
- `GET /api/orders/:id/invoice`

## Notes

- The old localStorage flow still works as a fallback for development.
- Production data should be stored in PostgreSQL, not only in browser storage.
