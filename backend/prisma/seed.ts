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

  // seed employer if none exists
  const existingEmployer = await prisma.user.findFirst({
    where: { role: "EMPLOYER" },
  });
  if (!existingEmployer) {
    await prisma.user.create({
      data: { loginCode: "1000", role: "EMPLOYER" },
    });
  }

  // temp employee for RBAC testing, remove once POST /employees exists
  const existingEmployee = await prisma.user.findFirst({
    where: { role: "EMPLOYEE" },
  });
  if (!existingEmployee) {
    await prisma.user.create({
      data: { loginCode: "2000", role: "EMPLOYEE" },
    });
  }

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
