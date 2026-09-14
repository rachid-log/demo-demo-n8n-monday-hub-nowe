# CreaBeast Next.js Prototype Boilerplate

A production-ready Next.js starter repository tailored specifically for the **CreaBeast VPS deployment architecture**. Engineered for rapid micro-SaaS prototyping and autonomous AI agents ([Antigravity CLI](https://antigravity.google) / `agy`).

---

## Architecture & VPS Deployment Topology

```
                  Internet (HTTPS :443)
                            │
                            ▼
          ┌──────────────────────────────────┐
          │      Traefik (root compose)      │
          │     Resolver: mytlschallenge     │
          └─────────────────┬────────────────┘
                            │ (shared network: root_default)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Prototype Web Container (:3000)                       │
│  - Host: ${SUBDOMAIN:-demo}.creabeast.com              │
│  - Multi-stage Next.js Standalone                      │
│  - Memory: 1536 MB RAM, 2048 MB Swap                   │
│  - Networks: root_default + default (internal)         │
└───────────────────────────┬────────────────────────────┘
                            │ (private internal default network only)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Optional PostgreSQL Database Container (:5432)        │
│  - Profile: with-db                                    │
│  - Internal only: never exposed to root_default        │
└────────────────────────────────────────────────────────┘
```

### Key Technical Specs

| Feature | Specification | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript | High performance, server components, route handlers |
| **Styling** | Tailwind CSS v4 | Rapid UI iteration, minimal CSS bundle footprint |
| **Docker Build** | Multi-stage build with `output: 'standalone'` | Minimal container image size (~150MB) and fast boot |
| **Traefik Routing** | `Host(\`${SUBDOMAIN:-demo}.creabeast.com\`)` | Dynamic subdomain matching without modifying Traefik config |
| **TLS Resolver** | `mytlschallenge` | Automated Let's Encrypt certificates over port 443 |
| **Traefik Network** | `traefik.docker.network=root_default` | Mandatory for multi-network containers so Traefik reaches the web service |
| **Memory Limit** | `mem_limit: 1536m` / `memswap_limit: 2048m` | Prevents kernel OOM killing neighbouring VPS services (n8n, databases) |
| **Database ORM** | Prisma ORM 6 (`@prisma/client` & `prisma`) | Type-safe queries, migration deployment, singleton client in `src/lib/db.ts` |
| **Database Service**| PostgreSQL 16 Alpine (`--profile with-db`) | Optional local DB container kept private on stack network |
| **Healthchecks** | `/api/healthz` responding HTTP 200 | Docker & Traefik liveness monitoring |

---

## Autonomous Agent (`agy`) Drop-in Guide

When an autonomous agent like `agy` (or Claude Code) creates a new project using this boilerplate, execute these steps:

### 1. Copy Template & Set Subdomain
```bash
# Target directory
cp -r /home/rachid/DEV/prototype-boilerplate /home/rachid/DEV/my-new-app
cd /home/rachid/DEV/my-new-app

# Configure target subdomain
cp .env.example .env
sed -i 's/SUBDOMAIN=demo/SUBDOMAIN=my-new-app/' .env
sed -i 's/COMPOSE_PROJECT_NAME=prototype/COMPOSE_PROJECT_NAME=my-new-app/' .env
```

### 2. Define Schema & Generate Prisma Client
Edit [`prisma/schema.prisma`](file:///home/rachid/DEV/prototype-boilerplate/prisma/schema.prisma) with your required models, then run:
```bash
npm run prisma:generate
```

### 3. Implement Business Logic
- Add App Router pages and layouts in `src/app/`
- Add API endpoints in `src/app/api/`
- Query the database using the singleton client:
  ```typescript
  import { db } from "@/lib/db";

  const data = await db.project.findMany();
  ```
- Keep `/api/healthz` functional for Docker liveness checks.

### 4. Deploy to Public Subdomain
Run the automated deployment script:
```bash
# Deploy with optional local PostgreSQL container
./scripts/deploy.sh my-new-app --with-db

# Or deploy standalone (e.g. SQLite or external Neon / Supabase database)
./scripts/deploy.sh my-new-app
```

The prototype will be live and SSL-secured at:
**`https://my-new-app.creabeast.com`**

---

## Repository Structure

```
prototype-boilerplate/
├── Dockerfile                  # Multi-stage standalone Next.js build
├── docker-compose.yml          # Traefik labels, root_default, memory limits, optional db
├── docker-entrypoint.sh        # Startup script applying pending Prisma migrations
├── package.json                # Next.js 16, React 19, Tailwind v4, Prisma 6, Lucide
├── next.config.ts              # output: 'standalone' and serverExternalPackages
├── tsconfig.json               # TypeScript configuration with @/* path alias
├── postcss.config.mjs          # PostCSS with @tailwindcss/postcss
├── .env.example                # Documented environment variables & connection strings
├── .gitignore                  # Git ignore rules including .env protections
├── .dockerignore               # Docker build exclusions
├── scripts/
│   └── deploy.sh               # One-command build & deploy script
├── prisma/
│   ├── schema.prisma           # Prisma schema with User and Project models
│   └── seed.ts                 # Database seeding script
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── healthz/route.ts # Healthcheck endpoint for Docker & Traefik
    │   │   └── projects/route.ts# Example REST CRUD endpoint
    │   ├── globals.css         # Tailwind CSS v4 styles & CSS variables
    │   ├── layout.tsx          # Root HTML layout & font definitions
    │   └── page.tsx            # Interactive starter dashboard & system status
    └── lib/
        ├── db.ts               # PrismaClient singleton with dev connection cache
        └── prisma.ts           # Export alias for db
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Start development server
npm run dev
# Open http://localhost:3000

# 4. Run database migrations (when Postgres is reachable)
npm run prisma:migrate
npm run prisma:seed
```

---

## Docker Compose Commands

### Deploy Web Only (External DB or Stateles)
```bash
docker compose up -d --build
```

### Deploy Web + PostgreSQL Stack
```bash
docker compose --profile with-db up -d --build
```

### Check Logs & Status
```bash
docker compose logs -f web
docker compose ps
```

### Run Migration Inside Container
```bash
docker compose exec web npx prisma migrate deploy
```
