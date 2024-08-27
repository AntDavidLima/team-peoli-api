/*
  Warnings:

  - You are about to drop the column `training_id` on the `workout` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "workout" DROP CONSTRAINT "workout_training_id_fkey";

-- AlterTable
ALTER TABLE "workout" DROP COLUMN "training_id";

-- CreateTable
CREATE TABLE "_TrainingToWorkout" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TrainingToWorkout_AB_unique" ON "_TrainingToWorkout"("A", "B");

-- CreateIndex
CREATE INDEX "_TrainingToWorkout_B_index" ON "_TrainingToWorkout"("B");

-- AddForeignKey
ALTER TABLE "_TrainingToWorkout" ADD CONSTRAINT "_TrainingToWorkout_A_fkey" FOREIGN KEY ("A") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingToWorkout" ADD CONSTRAINT "_TrainingToWorkout_B_fkey" FOREIGN KEY ("B") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
