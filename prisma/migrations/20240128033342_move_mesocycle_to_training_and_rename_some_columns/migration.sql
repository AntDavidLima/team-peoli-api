/*
  Warnings:

  - You are about to drop the column `userId` on the `Workout` table. All the data in the column will be lost.
  - You are about to drop the column `mesocycle` on the `exercise` table. All the data in the column will be lost.
  - Added the required column `student_id` to the `Workout` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Workout" DROP CONSTRAINT "Workout_userId_fkey";

-- AlterTable
ALTER TABLE "Workout" DROP COLUMN "userId",
ADD COLUMN     "student_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "exercise" DROP COLUMN "mesocycle";

-- AlterTable
ALTER TABLE "training" ADD COLUMN     "mesocycle" TEXT;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
