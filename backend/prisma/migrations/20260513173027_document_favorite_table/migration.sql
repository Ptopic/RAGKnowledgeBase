-- CreateTable
CREATE TABLE "user_document_favorites" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "document_id" INTEGER NOT NULL,

    CONSTRAINT "user_document_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_document_favorites_user_id_idx" ON "user_document_favorites"("user_id");

-- CreateIndex
CREATE INDEX "user_document_favorites_document_id_idx" ON "user_document_favorites"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_document_favorites_user_id_document_id_key" ON "user_document_favorites"("user_id", "document_id");

-- AddForeignKey
ALTER TABLE "user_document_favorites" ADD CONSTRAINT "user_document_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_favorites" ADD CONSTRAINT "user_document_favorites_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
