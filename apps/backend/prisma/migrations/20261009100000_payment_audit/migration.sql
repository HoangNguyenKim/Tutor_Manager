-- Add idempotency key to Payment and audit trail for corrections.
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateTable
CREATE TABLE "PaymentCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "previousAmountVnd" INTEGER NOT NULL,
    "newAmountVnd" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentCorrection_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PaymentCorrection_paymentId_createdAt_idx" ON "PaymentCorrection"("paymentId", "createdAt");
