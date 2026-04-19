import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const shiftNames = ["Morning", "Afternoon", "Night"];
  for (const name of shiftNames) {
    await prisma.shift.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.user.upsert({
    where: { loginCode: "1000" },
    update: {},
    create: {
      loginCode: "1000",
      role: "EMPLOYER",
    },
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
