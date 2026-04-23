-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
