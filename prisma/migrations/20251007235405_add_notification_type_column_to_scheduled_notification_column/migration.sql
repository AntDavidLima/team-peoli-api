-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REST', 'FINISH_REMINDER');

-- AlterTable
ALTER TABLE "scheduled_notification" ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'REST';
