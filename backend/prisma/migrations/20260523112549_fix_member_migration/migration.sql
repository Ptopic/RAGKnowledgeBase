/*
  Warnings:

  - The primary key for the `search_space_members` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "search_space_members" DROP CONSTRAINT "search_space_members_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "search_space_members_pkey" PRIMARY KEY ("id");
