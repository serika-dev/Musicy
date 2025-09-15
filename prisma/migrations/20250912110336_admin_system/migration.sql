/*
  Warnings:

  - You are about to drop the column `ownerId` on the `albums` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `tracks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER');

-- DropForeignKey
ALTER TABLE "public"."albums" DROP CONSTRAINT "albums_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tracks" DROP CONSTRAINT "tracks_ownerId_fkey";

-- AlterTable
ALTER TABLE "public"."albums" DROP COLUMN "ownerId";

-- AlterTable
ALTER TABLE "public"."tracks" DROP COLUMN "ownerId";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "password" TEXT,
ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'USER';
