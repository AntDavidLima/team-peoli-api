/*
  Warnings:

  - You are about to drop the column `changed_original_password` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "changed_original_password",
ADD COLUMN     "last_password_change" TIMESTAMP(3);
