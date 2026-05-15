-- CreateTable
CREATE TABLE "search_space_pinned_query_templates" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_space_id" INTEGER NOT NULL,
    "query_template_id" INTEGER NOT NULL,

    CONSTRAINT "search_space_pinned_query_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_space_pinned_query_templates_search_space_id_idx" ON "search_space_pinned_query_templates"("search_space_id");

-- CreateIndex
CREATE INDEX "search_space_pinned_query_templates_query_template_id_idx" ON "search_space_pinned_query_templates"("query_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_space_pinned_query_templates_search_space_id_query_t_key" ON "search_space_pinned_query_templates"("search_space_id", "query_template_id");

-- AddForeignKey
ALTER TABLE "search_space_pinned_query_templates" ADD CONSTRAINT "search_space_pinned_query_templates_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_space_pinned_query_templates" ADD CONSTRAINT "search_space_pinned_query_templates_query_template_id_fkey" FOREIGN KEY ("query_template_id") REFERENCES "query_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
