import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const demoUser = await prisma.user.upsert({
    where: { email: "founder@creabeast.com" },
    update: {},
    create: {
      email: "founder@creabeast.com",
      name: "CreaBeast Prototype Lead",
      role: "admin",
      projects: {
        create: [
          {
            name: "Rapid MVP Pipeline",
            description: "Autonomous micro-SaaS prototype running on VPS Traefik infrastructure",
            status: "active",
          },
          {
            name: "AI Content Automation",
            description: "Content generation worker integrated with n8n and Traefik router",
            status: "planning",
          },
        ],
      },
    },
  });

  console.log(`✅ Seed complete. Seeded user: ${demoUser.email} (${demoUser.id})`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
