/*
  Warnings:

  - The primary key for the `chat_share_links` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "chat_share_links" DROP CONSTRAINT "chat_share_links_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "chat_share_links_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "chat_share_links_slug_idx" ON "chat_share_links"("slug");
