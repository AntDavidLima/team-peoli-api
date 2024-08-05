/*
  Warnings:

  - A unique constraint covering the columns `[workout_id,exercise_id]` on the table `workout_exercise` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "workout_exercise_workout_id_exercise_id_key" ON "workout_exercise"("workout_id", "exercise_id");
