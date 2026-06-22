-- CreateEnum
CREATE TYPE "ChatParticipantStatus" AS ENUM ('active', 'left');

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ChatParticipantStatus" NOT NULL DEFAULT 'active',
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_group_id_user_id_key" ON "chat_participants"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_participants_user_id_status_idx" ON "chat_participants"("user_id", "status");

-- CreateIndex
CREATE INDEX "chat_participants_group_id_status_idx" ON "chat_participants"("group_id", "status");

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
