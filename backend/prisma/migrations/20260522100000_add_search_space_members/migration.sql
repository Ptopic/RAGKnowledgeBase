-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "search_space_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_space_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'VIEWER',
    "invited_by_id" TEXT NOT NULL,

    CONSTRAINT "search_space_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_space_members_search_space_id_user_id_key" ON "search_space_members"("search_space_id", "user_id");

-- CreateIndex
CREATE INDEX "search_space_members_search_space_id_idx" ON "search_space_members"("search_space_id");

-- CreateIndex
CREATE INDEX "search_space_members_user_id_idx" ON "search_space_members"("user_id");

-- CreateIndex
CREATE INDEX "search_space_members_invited_by_id_idx" ON "search_space_members"("invited_by_id");

-- AddForeignKey
ALTER TABLE "search_space_members" ADD CONSTRAINT "search_space_members_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_space_members" ADD CONSTRAINT "search_space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_space_members" ADD CONSTRAINT "search_space_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create OWNER memberships for all existing search spaces
INSERT INTO "search_space_members" ("search_space_id", "user_id", "role", "invited_by_id")
SELECT "id", "user_id", 'OWNER', "user_id"
FROM "searchspaces"
WHERE NOT EXISTS (
    SELECT 1 FROM "search_space_members" m
    WHERE m."search_space_id" = "searchspaces"."id" AND m."user_id" = "searchspaces"."user_id"
);
