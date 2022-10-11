/*
  Warnings:

  - You are about to drop the column `DNI` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[DNI]` on the table `DoctorProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[DNI]` on the table `PatientProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_DNI_key";

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "DNI" INTEGER NOT NULL DEFAULT 99999999;

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "DNI" INTEGER NOT NULL DEFAULT 99999999;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "DNI",
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Pedro Huerta';

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_DNI_key" ON "DoctorProfile"("DNI");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_DNI_key" ON "PatientProfile"("DNI");
