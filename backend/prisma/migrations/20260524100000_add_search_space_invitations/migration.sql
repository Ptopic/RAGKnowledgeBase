-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "search_space_invitations" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_space_id" INTEGER NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invitee_email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_by" TEXT,

    CONSTRAINT "search_space_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_space_invitations_token_key" ON "search_space_invitations"("token");

-- CreateIndex
CREATE INDEX "search_space_invitations_search_space_id_idx" ON "search_space_invitations"("search_space_id");

-- CreateIndex
CREATE INDEX "search_space_invitations_inviter_id_idx" ON "search_space_invitations"("inviter_id");

-- CreateIndex
CREATE INDEX "search_space_invitations_invitee_email_idx" ON "search_space_invitations"("invitee_email");

-- CreateIndex
CREATE INDEX "search_space_invitations_token_idx" ON "search_space_invitations"("token");

-- CreateIndex
CREATE INDEX "search_space_invitations_status_idx" ON "search_space_invitations"("status");

-- AddForeignKey
ALTER TABLE "search_space_invitations" ADD CONSTRAINT "search_space_invitations_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_space_invitations" ADD CONSTRAINT "search_space_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_space_invitations" ADD CONSTRAINT "search_space_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
