## Backend (Node + Express + MySQL)

### Requirements

- Node.js 18+
- MySQL 8+ (recommended)

### Setup

Create a database (example):

```sql
CREATE DATABASE rescue_roots_nepal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Create your env file:

- Copy `backend/env.example` → `backend/.env` and fill in values  
  - Keep `AUTO_MIGRATE=true` if you want tables auto-created on server startup

Install deps:

```bash
cd backend
npm install
```

Run migrations (creates tables):

```bash
cd backend
npm run db:migrate
```

Start the API:

```bash
cd backend
npm run dev
```

### API (initial)

- `GET /api/health` (checks DB connection)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/dogs`
- `GET /api/dogs/:id`
- `POST /api/reports` (report a dog)
- `GET /api/reports`

### Notes

- CORS origin is controlled by `FRONTEND_ORIGIN` (default: `http://localhost:5173`)
- The frontend currently uses mock data; you can wire it to these endpoints later.

