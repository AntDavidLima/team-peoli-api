/*
  Warnings:

  - You are about to drop the column `routine_id` on the `training` table. All the data in the column will be lost.
  - You are about to drop the `_TrainingToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_TrainingToUser" DROP CONSTRAINT "_TrainingToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_TrainingToUser" DROP CONSTRAINT "_TrainingToUser_B_fkey";

-- DropForeignKey
ALTER TABLE "training" DROP CONSTRAINT "training_routine_id_fkey";

-- AlterTable
ALTER TABLE "training" DROP COLUMN "routine_id";

-- DropTable
DROP TABLE "_TrainingToUser";

-- CreateTable
CREATE TABLE "_RoutineToTraining" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RoutineToTraining_AB_unique" ON "_RoutineToTraining"("A", "B");

-- CreateIndex
CREATE INDEX "_RoutineToTraining_B_index" ON "_RoutineToTraining"("B");

-- AddForeignKey
ALTER TABLE "_RoutineToTraining" ADD CONSTRAINT "_RoutineToTraining_A_fkey" FOREIGN KEY ("A") REFERENCES "routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoutineToTraining" ADD CONSTRAINT "_RoutineToTraining_B_fkey" FOREIGN KEY ("B") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE CASCADE;
