<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Autonomous Agent (`agy`) Deployment Instructions

You are building a prototype on the CreaBeast VPS infrastructure. Follow these conventions:

1. **Subdomain Routing**:
   - Set `SUBDOMAIN=<your-service-name>` in `.env`.
   - Your application will be accessible at `https://${SUBDOMAIN}.creabeast.com`.
   - Traefik routing requires the container to join `root_default` network and specify `traefik.docker.network=root_default`.
   - Do NOT publish ports to the host (`ports: [...]` must stay omitted); Traefik routes internal port 3000 directly.

2. **Memory Ceiling**:
   - The VPS is shared with n8n, WordPress, and databases.
   - Respect `mem_limit: 1536m` and `memswap_limit: 2048m` in `docker-compose.yml`.

3. **Database Usage**:
   - Import the Prisma client singleton from `@/lib/db`.
   - When modifying `prisma/schema.prisma`, run `npm run prisma:generate`.
   - If using local Postgres, activate `--profile with-db` during `docker compose up`.
   - Keep the database service on the stack's private `default` network only (NEVER expose to `root_default`).

4. **Health Check**:
   - Maintain the `/api/healthz` endpoint returning HTTP 200 `{ status: "ok" }`.
   - Docker and Traefik rely on this endpoint for liveness validation.

5. **Deployment Command**:
   - `./scripts/deploy.sh <subdomain> [--with-db]`
