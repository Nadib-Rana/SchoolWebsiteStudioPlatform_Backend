import { PrismaClient, Role, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const defaultPassword = await bcrypt.hash("admin12345", 10);
  const userPassword = await bcrypt.hash("user12345", 10);

  // 1. Seed Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      email: "superadmin@example.com",
      username: "superadmin",
      password: defaultPassword,
      firstName: "Super",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 2. Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      username: "admin",
      password: defaultPassword,
      firstName: "System",
      lastName: "Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // 3. Seed Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      username: "demouser",
      password: userPassword,
      firstName: "Demo",
      lastName: "User",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Demo User created: ${demoUser.email}`);

  // 4. Seed Sample Post
  const samplePost = await prisma.post.upsert({
    where: { slug: "welcome-to-nest-starter-template" },
    update: {},
    create: {
      slug: "welcome-to-nest-starter-template",
      title: "Welcome to Nest Starter Template",
      summary: "A production-ready NestJS starter template with Prisma, PostgreSQL, JWT Auth, and Docker.",
      content:
        "# Welcome to Nest Starter Template\n\nThis template provides a modular architecture with authentication, RBAC, MinIO storage, email templates, and automated tests.",
      published: true,
      tags: ["nestjs", "prisma", "typescript", "starter-template"],
      authorId: superAdmin.id,
    },
  });
  console.log(`✅ Sample Post created: ${samplePost.title}`);

  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
