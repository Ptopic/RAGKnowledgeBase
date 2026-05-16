-- CreateTable
CREATE TABLE "user_chat_favorite" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "chat_id" INTEGER NOT NULL,

    CONSTRAINT "user_chat_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_chat_favorite_user_id_idx" ON "user_chat_favorite"("user_id");

-- CreateIndex
CREATE INDEX "user_chat_favorite_chat_id_idx" ON "user_chat_favorite"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_chat_favorite_user_id_chat_id_key" ON "user_chat_favorite"("user_id", "chat_id");

-- AddForeignKey
ALTER TABLE "user_chat_favorite" ADD CONSTRAINT "user_chat_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chat_favorite" ADD CONSTRAINT "user_chat_favorite_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
