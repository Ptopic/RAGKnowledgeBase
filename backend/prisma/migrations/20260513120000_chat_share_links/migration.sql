-- CreateTable
CREATE TABLE "chat_share_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_id" INTEGER NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "chat_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_share_links_slug_key" ON "chat_share_links"("slug");
CREATE INDEX "chat_share_links_chat_id_idx" ON "chat_share_links"("chat_id");

-- AddForeignKey
ALTER TABLE "chat_share_links" ADD CONSTRAINT "chat_share_links_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
