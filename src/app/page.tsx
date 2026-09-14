"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Database,
  Globe,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Cpu,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface HealthData {
  status: string;
  service: string;
  subdomain: string;
  timestamp: string;
  uptimeSeconds: number;
  database: string;
  latencyMs: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/healthz");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error("Health check failed:", e);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchProjects = async () => {
    setProjectLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setProjects(json.data);
        }
      }
    } catch (e) {
      console.error("Projects fetch failed:", e);
    } finally {
      setProjectLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const [hRes, pRes] = await Promise.allSettled([
          fetch("/api/healthz").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/projects").then((r) => (r.ok ? r.json() : null)),
        ]);

        if (!active) return;

        if (hRes.status === "fulfilled" && hRes.value) {
          setHealth(hRes.value);
        }
        if (pRes.status === "fulfilled" && pRes.value?.data) {
          setProjects(pRes.value.data);
        }
      } catch (e) {
        console.error("Failed to load initial data:", e);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewProjectName("");
        setNewProjectDesc("");
        setToastMessage("Project created successfully!");
        fetchProjects();
      } else {
        setToastMessage(data.error || "Failed to create project");
      }
    } catch {
      setToastMessage("Network error creating project");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Navigation */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg shadow-inner">
              ⚡
            </div>
            <div>
              <span className="font-bold tracking-tight text-white">CreaBeast</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Prototype Boilerplate
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="/api/healthz"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono px-3 py-1.5 rounded-md bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 flex items-center gap-1.5 transition"
            >
              <span>/api/healthz</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 sm:p-10 overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Production-Ready VPS Scaffold</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Launch Instant Prototypes to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                *.creabeast.com
              </span>
            </h1>
            <p className="text-neutral-400 text-base sm:text-lg leading-relaxed">
              Engineered specifically for autonomous agents (<code className="text-emerald-400 font-mono">agy</code>) and rapid development.
              Pre-wired with Traefik ingress, <code className="text-neutral-300 font-mono">root_default</code> networking,
              Let&apos;s Encrypt TLS challenge, standalone Docker build, and Prisma ORM.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-neutral-800/60">
            <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 font-medium">Framework</div>
              <div className="text-sm font-semibold text-white mt-1">Next.js 16 (App Router)</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 font-medium">Styling</div>
              <div className="text-sm font-semibold text-white mt-1">Tailwind CSS v4</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 font-medium">Database ORM</div>
              <div className="text-sm font-semibold text-white mt-1">Prisma + PostgreSQL</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 font-medium">Ingress & Proxy</div>
              <div className="text-sm font-semibold text-white mt-1">Traefik TLS Challenge</div>
            </div>
          </div>
        </div>

        {/* Live System & Ingress Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Traefik & Routing */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Globe className="w-5 h-5" />
                  <span className="font-semibold text-sm">Traefik Router</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  TLS / 443
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-neutral-300">
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">Domain</span>
                  <span className="text-white">{"${SUBDOMAIN}.creabeast.com"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">Entrypoint</span>
                  <span className="text-white">websecure (443)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">Cert Resolver</span>
                  <span className="text-emerald-400 font-semibold">mytlschallenge</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Network</span>
                  <span className="text-white">root_default</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Resource & Memory Ceilings */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                  <span className="font-semibold text-sm">VPS Resource Limits</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  OOM Protected
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-neutral-300">
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">RAM Limit</span>
                  <span className="text-white">1536 MB (1.5 GB)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">RAM + Swap</span>
                  <span className="text-white">2048 MB (2.0 GB)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">Restart Policy</span>
                  <span className="text-white">unless-stopped</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Log Rotation</span>
                  <span className="text-white">10MB × 3 files</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Live Health Check */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Server className="w-5 h-5" />
                  <span className="font-semibold text-sm">Liveness & Health</span>
                </div>
                <button
                  onClick={fetchHealth}
                  disabled={healthLoading}
                  className="p-1 text-neutral-400 hover:text-white transition disabled:opacity-50"
                  title="Refresh health"
                >
                  <RefreshCw className={`w-4 h-4 ${healthLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {health ? (
                <div className="space-y-2 text-xs font-mono text-neutral-300">
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-500">Status</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {health.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-500">Database</span>
                    <span
                      className={`font-semibold ${
                        health.database === "connected"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {health.database}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-500">Uptime</span>
                    <span className="text-white">{health.uptimeSeconds}s</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Latency</span>
                    <span className="text-white">{health.latencyMs}ms</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-neutral-500">
                  {healthLoading ? "Checking liveness..." : "Health data unavailable"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Database & Prisma Section */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-purple-400 mb-1">
                <Database className="w-5 h-5" />
                <h2 className="text-lg font-bold text-white">Database & Business Logic Store</h2>
              </div>
              <p className="text-xs text-neutral-400">
                Configured with Prisma ORM client singleton, pre-built models (<code className="text-neutral-300 font-mono">User</code>, <code className="text-neutral-300 font-mono">Project</code>), and migrations.
              </p>
            </div>
            <button
              onClick={fetchProjects}
              disabled={projectLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700 transition self-start"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${projectLoading ? "animate-spin" : ""}`} />
              <span>Reload Data</span>
            </button>
          </div>

          {toastMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Form to insert a record */}
          <form
            onSubmit={handleCreateProject}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80"
          >
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Project Name</label>
              <input
                type="text"
                placeholder="e.g. Invoicing Agent MVP"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Description</label>
              <input
                type="text"
                placeholder="e.g. Automated PDF generator for n8n"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting || !newProjectName.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? "Creating..." : "Save Project"}</span>
              </button>
            </div>
          </form>

          {/* Records Display */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Persisted Projects ({projects.length})
            </div>

            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-xs text-neutral-500 space-y-1">
                <AlertCircle className="w-5 h-5 mx-auto text-neutral-600 mb-2" />
                <p>No project records found in database.</p>
                <p className="text-neutral-600">
                  Ensure <code className="font-mono text-neutral-400">DATABASE_URL</code> is connected, or run{" "}
                  <code className="font-mono text-neutral-400">npm run prisma:seed</code>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/80 hover:border-neutral-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {p.status}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <div className="text-[10px] font-mono text-neutral-500 mt-3">
                      ID: {p.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Autonomous Agent (agy) Playbook */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Terminal className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Autonomous Agent (agy) Deployment Guide</h2>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            When an AI agent (such as <code className="text-cyan-300 font-mono">agy</code> or Claude Code) is tasked with building a micro-service or SaaS MVP, follow this standard 4-step workflow:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono">
                  1
                </span>
                <span>Copy & Configure Subdomain</span>
              </div>
              <pre className="text-[11px] font-mono p-3 rounded-lg bg-neutral-900 text-neutral-300 overflow-x-auto border border-neutral-800">
{`# In the new prototype directory:
cp .env.example .env
sed -i 's/SUBDOMAIN=demo/SUBDOMAIN=myapp/' .env`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono">
                  2
                </span>
                <span>Update Prisma Schema</span>
              </div>
              <pre className="text-[11px] font-mono p-3 rounded-lg bg-neutral-900 text-neutral-300 overflow-x-auto border border-neutral-800">
{`# Add business models to prisma/schema.prisma
npx prisma generate
# Optional: push schema to Postgres
npm run prisma:push`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono">
                  3
                </span>
                <span>Implement App Router & API</span>
              </div>
              <pre className="text-[11px] font-mono p-3 rounded-lg bg-neutral-900 text-neutral-300 overflow-x-auto border border-neutral-800">
{`# Drop business components into src/app/
# Endpoints under src/app/api/
# Keep /api/healthz responding 200 OK`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono">
                  4
                </span>
                <span>Deploy with One Command</span>
              </div>
              <pre className="text-[11px] font-mono p-3 rounded-lg bg-neutral-900 text-neutral-300 overflow-x-auto border border-neutral-800">
{`# Automated deployment script:
./scripts/deploy.sh myapp
# Instantly live at https://myapp.creabeast.com`}
              </pre>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/60 mt-16 py-8 text-center text-xs text-neutral-500 font-mono">
        <div>CreaBeast Prototype Boilerplate • Traefik v2+ Ingress • Next.js Standalone</div>
      </footer>
    </div>
  );
}
