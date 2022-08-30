/*
  Warnings:

  - The values [SAML] on the enum `IdentityProvider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IdentityProvider_new" AS ENUM ('CAL', 'MAGIC', 'GOOGLE', 'FACEBOOK');
ALTER TABLE "users" ALTER COLUMN "identityProvider" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "identityProvider" TYPE "IdentityProvider_new" USING ("identityProvider"::text::"IdentityProvider_new");
ALTER TYPE "IdentityProvider" RENAME TO "IdentityProvider_old";
ALTER TYPE "IdentityProvider_new" RENAME TO "IdentityProvider";
DROP TYPE "IdentityProvider_old";
ALTER TABLE "users" ALTER COLUMN "identityProvider" SET DEFAULT 'GOOGLE';
COMMIT;

-- AlterTable
ALTER TABLE "Attendee" ALTER COLUMN "locale" SET DEFAULT 'es';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "timeZone" SET DEFAULT 'America/Lima',
ALTER COLUMN "weekStart" SET DEFAULT 'Monday',
ALTER COLUMN "hideBranding" SET DEFAULT true,
ALTER COLUMN "plan" SET DEFAULT 'PRO',
ALTER COLUMN "identityProvider" SET DEFAULT 'GOOGLE',
ALTER COLUMN "role" SET DEFAULT 'USER';
