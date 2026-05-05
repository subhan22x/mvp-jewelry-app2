import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.user.upsert({
    where: { id: "demo" },
    update: {},
    create: { id: "demo", storeName: "Demo Store" }
  });
  console.log("Seeded demo user.");
} finally {
  await prisma.$disconnect();
}
