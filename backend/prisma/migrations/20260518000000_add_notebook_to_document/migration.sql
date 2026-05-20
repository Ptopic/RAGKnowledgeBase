-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'NOTEBOOK';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "notebook_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "documents_notebook_id_key" ON "documents"("notebook_id");

-- CreateIndex
CREATE INDEX "documents_notebook_id_idx" ON "documents"("notebook_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "notebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
