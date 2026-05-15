-- CreateTable
CREATE TABLE "query_templates" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "content" TEXT NOT NULL,
    "icon" VARCHAR(100),
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "search_space_id" INTEGER,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "query_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "query_templates_search_space_id_idx" ON "query_templates"("search_space_id");

-- CreateIndex
CREATE INDEX "query_templates_is_global_idx" ON "query_templates"("is_global");

-- CreateIndex
CREATE INDEX "query_templates_created_by_id_idx" ON "query_templates"("created_by_id");

-- AddForeignKey
ALTER TABLE "query_templates" ADD CONSTRAINT "query_templates_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_templates" ADD CONSTRAINT "query_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
