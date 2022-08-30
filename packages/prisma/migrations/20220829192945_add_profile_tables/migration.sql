/*
  Warnings:

  - You are about to drop the column `patientId` on the `Account` table. All the data in the column will be lost.
  - The primary key for the `Patient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Patient` table. All the data in the column will be lost.
  - The `id` column on the `Patient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `ResetPasswordRequest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[DNI]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[patientDNI]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctorId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `DNI` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_patientId_fkey";

-- DropIndex
DROP INDEX "Patient_email_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "patientId";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "paid" SET DEFAULT true;

-- AlterTable
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_pkey",
DROP COLUMN "email",
DROP COLUMN "emailVerified",
DROP COLUMN "image",
DROP COLUMN "name",
DROP COLUMN "role",
ADD COLUMN     "DNI" INTEGER NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Patient_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "doctorId" INTEGER,
ADD COLUMN     "patientDNI" INTEGER;

-- DropTable
DROP TABLE "ResetPasswordRequest";

-- CreateTable
CREATE TABLE "Doctor" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_DNI_key" ON "Patient"("DNI");

-- CreateIndex
CREATE UNIQUE INDEX "users_patientDNI_key" ON "users"("patientDNI");

-- CreateIndex
CREATE UNIQUE INDEX "users_doctorId_key" ON "users"("doctorId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_patientDNI_fkey" FOREIGN KEY ("patientDNI") REFERENCES "Patient"("DNI") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
