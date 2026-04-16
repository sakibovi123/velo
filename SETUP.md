# Velo — First-Run Setup Guide

This project has four services. Run them in the order listed below.

```
velo/
├── backend-django/   → Django REST API        (port 8000)
├── socket-node/      → Node WebSocket server  (port 3001)
├── dashboard-next/   → Agent dashboard        (port 3000)
└── widget-preact/    → Embeddable widget       (port 5173 in dev)
```

---

## Prerequisites

Install these before anything else.

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 15+ | https://postgresql.org |
| Redis | 7+ | https://redis.io |

Verify:
```bash
python --version
node --version
psql --version
redis-cli ping   # should print PONG
```

---

## Step 1 — PostgreSQL: Create the database

```bash
psql -U postgres
```

Inside the psql shell:
```sql
CREATE USER velo_user WITH PASSWORD 'velo_pass';
CREATE DATABASE velo_db OWNER velo_user;
\q
```

Then enable the pgvector extension (required for the AI layer):
```bash
psql -U velo_user -d velo_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## Step 2 — Django Backend (`/backend-django`)

### 2a. Create and activate a virtual environment

```bash
cd backend-django
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows
```

### 2b. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2c. Create the `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DEBUG=True
SECRET_KEY=replace-this-with-a-long-random-string
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://velo_user:velo_pass@localhost:5432/velo_db
OPENAI_API_KEY=sk-your-real-openai-key
INTERNAL_API_SECRET=replace-this-with-another-long-random-string
```

> **Important:** `SECRET_KEY` must match `JWT_SECRET` in the Node server's `.env`.
> `INTERNAL_API_SECRET` must match `INTERNAL_API_SECRET` in the Node server's `.env`.

Generate a strong secret key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2d. Run database migrations

```bash
python manage.py makemigrations accounts tenants ai_engine agents conversations
python manage.py migrate
```

> `tenants` migration now includes the `TenantApiKey` table.

### 2e. Create a superuser (admin account)

```bash
python manage.py createsuperuser
# Enter email and password when prompted
```

### 2f. Start the Django development server

```bash
python manage.py runserver
```

Django is now running at **http://localhost:8000**

Admin panel: **http://localhost:8000/admin/**

---

## Step 3 — Node WebSocket Server (`/socket-node`)

Open a new terminal tab.

### 3a. Install dependencies

```bash
cd socket-node
npm install
```

### 3b. Create the `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=SAME_VALUE_AS_DJANGO_SECRET_KEY
DJANGO_INTERNAL_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
API_KEY_CACHE_TTL=300
INTERNAL_API_SECRET=SAME_VALUE_AS_DJANGO_INTERNAL_API_SECRET
```

> `JWT_SECRET` **must exactly match** `SECRET_KEY` in `backend-django/.env`.
> `INTERNAL_API_SECRET` **must exactly match** `INTERNAL_API_SECRET` in `backend-django/.env`.

### 3c. Start the server

```bash
npm run dev
```

The WebSocket server is now running at **http://localhost:3001**

Health check: **http://localhost:3001/health**

---

## Step 4 — Agent Dashboard (`/dashboard-next`)

Open a new terminal tab.

### 4a. Install dependencies

```bash
cd dashboard-next
npm install
```

### 4b. Create the `.env.local` file

```bash
cp .env.example .env.local
```

Contents:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 4c. Start the dashboard

```bash
npm run dev
```

The dashboard is now running at **http://localhost:3000**

Log in with the superuser credentials you created in Step 2e.

---

## Step 5 — Embeddable Widget (`/widget-preact`)

Open a new terminal tab.

### 5a. Install dependencies

```bash
cd widget-preact
npm install
```

### 5b. Start the dev server

```bash
npm run dev
```

The widget dev harness is running at **http://localhost:5173**

Open it in a browser — you'll see a chat launcher button in the bottom-right corner.

> The dev harness (`index.html`) uses `api-key="pk_test_dev_key"`. You'll need to create a matching API key record in the Django admin before the socket handshake will succeed.

---

## Step 6 — First-time data setup (Django Admin)

Go to **http://localhost:8000/admin/** and create the following records in order:

1. **Tenant** — create one tenant (e.g. name: `Acme Corp`, slug: `acme`)
2. **Skill** — create at least one skill under that tenant (e.g. `General Support`). Note the UUID — you'll need it for `skill-id` on the widget.
3. **Agent Profile** — create one linked to your superuser + the tenant above. Set `skills` and `max_chat_capacity`.
4. **Tenant API Key** — create a key linked to the tenant. The generated `key` value is what goes in `api-key` on the widget embed tag.

---

## All services running — quick reference

| Service | Command | URL |
|---|---|---|
| Django API | `python manage.py runserver` | http://localhost:8000 |
| Node WS | `npm run dev` | http://localhost:3001 |
| Dashboard | `npm run dev` | http://localhost:3000 |
| Widget | `npm run dev` | http://localhost:5173 |
| Redis | `redis-server` | localhost:6379 |

---

## Production builds

### Widget — outputs a single `dist/widget.js`
```bash
cd widget-preact
npm run build
# Embed in any HTML page:
# <script src="dist/widget.js"></script>
# <velo-widget api-key="pk_live_xxx" skill-id="<uuid>" socket-url="https://rt.yourdomain.com"></velo-widget>
```

### Dashboard
```bash
cd dashboard-next
npm run build
npm run start
```

### Node server
```bash
cd socket-node
npm run build
npm run start
```

### Django
```bash
cd backend-django
gunicorn core.wsgi:application --bind 0.0.0.0:8000
```

Set `DJANGO_SETTINGS_MODULE=core.settings.production` and fill in production env vars before deploying.

---

## Common errors

**`relation "accounts_user" does not exist`**
→ You haven't run migrations yet. Run `python manage.py migrate`.

**`FATAL: role "velo_user" does not exist`**
→ Complete Step 1 (create the Postgres user and database).

**`Error: Cannot find module ...`** (Node)
→ Run `npm install` in the relevant directory.

**Socket connect fails with `AUTH_INVALID_TOKEN`**
→ `JWT_SECRET` in socket-node `.env` doesn't match `SECRET_KEY` in backend-django `.env`.

**`CREATE EXTENSION vector` fails**
→ Install the pgvector Postgres extension: https://github.com/pgvector/pgvector#installation

**`ModuleNotFoundError: No module named 'environ'`**
→ Virtual environment isn't activated. Run `source .venv/bin/activate`.
