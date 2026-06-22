ALTER TABLE "fund_qr_codes"
ADD COLUMN "webhook_config_id" TEXT,
ADD COLUMN "webhook_secret" TEXT;

CREATE UNIQUE INDEX "fund_qr_codes_webhook_config_id_key"
ON "fund_qr_codes"("webhook_config_id");
