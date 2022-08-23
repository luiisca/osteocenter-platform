/*
  Warnings:

  - You are about to drop the `PlatformAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformVerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `patientId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PlatformAccount" DROP CONSTRAINT "PlatformAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "PlatformSession" DROP CONSTRAINT "PlatformSession_userId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "patientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "patientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';

-- DropTable
DROP TABLE "PlatformAccount";

-- DropTable
DROP TABLE "PlatformSession";

-- DropTable
DROP TABLE "PlatformUser";

-- DropTable
DROP TABLE "PlatformVerificationToken";

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserPermissionRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
