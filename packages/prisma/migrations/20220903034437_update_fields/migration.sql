/*
  Warnings:

  - You are about to drop the column `patientDNI` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `Doctor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Patient` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[DNI]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[patientId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_patientDNI_fkey";

-- DropIndex
DROP INDEX "users_patientDNI_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "patientDNI",
ADD COLUMN     "DNI" INTEGER NOT NULL DEFAULT 99999999,
ADD COLUMN     "patientId" INTEGER;

-- DropTable
DROP TABLE "Doctor";

-- DropTable
DROP TABLE "Patient";

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_DNI_key" ON "users"("DNI");

-- CreateIndex
CREATE UNIQUE INDEX "users_patientId_key" ON "users"("patientId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
