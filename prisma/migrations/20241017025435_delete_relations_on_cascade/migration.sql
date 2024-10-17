/*
  Warnings:

  - You are about to drop the column `routine_id` on the `muscle_group` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "exercised_muscle_group" DROP CONSTRAINT "exercised_muscle_group_exercise_id_fkey";

-- DropForeignKey
ALTER TABLE "exercised_muscle_group" DROP CONSTRAINT "exercised_muscle_group_muscle_group_id_fkey";

-- DropForeignKey
ALTER TABLE "muscle_group" DROP CONSTRAINT "muscle_group_routine_id_fkey";

-- DropForeignKey
ALTER TABLE "routine" DROP CONSTRAINT "routine_user_id_fkey";

-- DropForeignKey
ALTER TABLE "training_exercise" DROP CONSTRAINT "training_exercise_exercise_id_fkey";

-- DropForeignKey
ALTER TABLE "training_exercise" DROP CONSTRAINT "training_exercise_training_id_fkey";

-- DropForeignKey
ALTER TABLE "workout" DROP CONSTRAINT "workout_student_id_fkey";

-- DropForeignKey
ALTER TABLE "workout_exercise" DROP CONSTRAINT "workout_exercise_exercise_id_fkey";

-- DropForeignKey
ALTER TABLE "workout_exercise" DROP CONSTRAINT "workout_exercise_workout_id_fkey";

-- DropForeignKey
ALTER TABLE "workout_exercise_sets" DROP CONSTRAINT "workout_exercise_sets_workout_exercise_id_fkey";

-- AlterTable
ALTER TABLE "muscle_group" DROP COLUMN "routine_id";

-- CreateTable
CREATE TABLE "_MuscleGroupToRoutine" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MuscleGroupToRoutine_AB_unique" ON "_MuscleGroupToRoutine"("A", "B");

-- CreateIndex
CREATE INDEX "_MuscleGroupToRoutine_B_index" ON "_MuscleGroupToRoutine"("B");

-- AddForeignKey
ALTER TABLE "routine" ADD CONSTRAINT "routine_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercised_muscle_group" ADD CONSTRAINT "exercised_muscle_group_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercised_muscle_group" ADD CONSTRAINT "exercised_muscle_group_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "muscle_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_exercise" ADD CONSTRAINT "training_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_exercise" ADD CONSTRAINT "training_exercise_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise_sets" ADD CONSTRAINT "workout_exercise_sets_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MuscleGroupToRoutine" ADD CONSTRAINT "_MuscleGroupToRoutine_A_fkey" FOREIGN KEY ("A") REFERENCES "muscle_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MuscleGroupToRoutine" ADD CONSTRAINT "_MuscleGroupToRoutine_B_fkey" FOREIGN KEY ("B") REFERENCES "routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
