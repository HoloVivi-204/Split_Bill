-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('one_time', 'weekly', 'biweekly', 'monthly');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('pending', 'paid', 'late', 'kicked');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('expense_added', 'fund_reminder', 'fund_paid', 'fund_late', 'fund_complete', 'settlement_suggested', 'member_joined', 'member_left', 'campaign_created', 'leave_request', 'leave_approved', 'leave_rejected', 'overpayment_alert');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'system');

-- CreateTable
CREATE TABLE "fund_campaigns" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount_per_person" DECIMAL(15,2) NOT NULL,
    "payment_frequency" "PaymentFrequency" NOT NULL,
    "suggested_amount_per_payment" DECIMAL(15,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "campaign_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_contributions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transfer_code" TEXT NOT NULL,
    "amount_required" DECIMAL(15,2) NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "ContributionStatus" NOT NULL DEFAULT 'pending',
    "fully_paid_at" TIMESTAMP(3),

    CONSTRAINT "fund_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_contribution_payments" (
    "id" TEXT NOT NULL,
    "contribution_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "transaction_ref" TEXT,
    "sepay_transaction_id" TEXT,
    "confirmed_by" TEXT,
    "note" TEXT,

    CONSTRAINT "fund_contribution_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_qr_codes" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_spendings" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "spent_at" DATE NOT NULL,
    "note" TEXT,
    "receipt_url" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_spendings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reads" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fund_campaigns_campaign_code_key" ON "fund_campaigns"("campaign_code");

-- CreateIndex
CREATE INDEX "fund_campaigns_group_id_idx" ON "fund_campaigns"("group_id");

-- CreateIndex
CREATE INDEX "fund_campaigns_group_id_status_idx" ON "fund_campaigns"("group_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fund_contributions_transfer_code_key" ON "fund_contributions"("transfer_code");

-- CreateIndex
CREATE INDEX "fund_contributions_campaign_id_idx" ON "fund_contributions"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_contributions_campaign_id_user_id_key" ON "fund_contributions"("campaign_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_contribution_payments_transaction_ref_key" ON "fund_contribution_payments"("transaction_ref");

-- CreateIndex
CREATE UNIQUE INDEX "fund_contribution_payments_sepay_transaction_id_key" ON "fund_contribution_payments"("sepay_transaction_id");

-- CreateIndex
CREATE INDEX "fund_contribution_payments_contribution_id_idx" ON "fund_contribution_payments"("contribution_id");

-- CreateIndex
CREATE INDEX "fund_contribution_payments_transaction_ref_idx" ON "fund_contribution_payments"("transaction_ref");

-- CreateIndex
CREATE INDEX "fund_qr_codes_group_id_is_active_idx" ON "fund_qr_codes"("group_id", "is_active");

-- CreateIndex
CREATE INDEX "fund_spendings_group_id_idx" ON "fund_spendings"("group_id");

-- CreateIndex
CREATE INDEX "messages_group_id_created_at_idx" ON "messages"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_group_id_is_pinned_idx" ON "messages"("group_id", "is_pinned");

-- CreateIndex
CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "message_reads"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "fund_campaigns" ADD CONSTRAINT "fund_campaigns_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_campaigns" ADD CONSTRAINT "fund_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "fund_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contribution_payments" ADD CONSTRAINT "fund_contribution_payments_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "fund_contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contribution_payments" ADD CONSTRAINT "fund_contribution_payments_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_qr_codes" ADD CONSTRAINT "fund_qr_codes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_qr_codes" ADD CONSTRAINT "fund_qr_codes_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_spendings" ADD CONSTRAINT "fund_spendings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_spendings" ADD CONSTRAINT "fund_spendings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

