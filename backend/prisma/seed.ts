import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 10;

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
    const hashedCode = await bcrypt.hash("1000", BCRYPT_ROUNDS);
    await prisma.user.create({
      data: { loginCode: hashedCode, role: "EMPLOYER" },
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
