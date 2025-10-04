-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED', 'ERROR');

-- CreateTable
CREATE TABLE "scheduled_notification" (
    "id" SERIAL NOT NULL,
    "payload" JSONB NOT NULL,
    "send_at" TIMESTAMP(3) NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "scheduled_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_notification_status_send_at_idx" ON "scheduled_notification"("status", "send_at");

-- AddForeignKey
ALTER TABLE "scheduled_notification" ADD CONSTRAINT "scheduled_notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
