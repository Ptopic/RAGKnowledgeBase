-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'BLOG';

-- CreateTable
CREATE TABLE "blogs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(20) NOT NULL DEFAULT 'html',
    "excerpt" VARCHAR(500),
    "search_space_id" INTEGER NOT NULL,
    "author_id" TEXT NOT NULL,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blogs_slug_key" ON "blogs"("slug");
CREATE INDEX "blogs_search_space_id_idx" ON "blogs"("search_space_id");
CREATE INDEX "blogs_slug_idx" ON "blogs"("slug");
CREATE INDEX "blogs_author_id_idx" ON "blogs"("author_id");

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
