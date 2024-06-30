/*
  Warnings:

  - The primary key for the `workout_exercise` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `load` on the `workout_exercise` table. All the data in the column will be lost.
  - You are about to drop the column `reps` on the `workout_exercise` table. All the data in the column will be lost.
  - You are about to drop the column `sets` on the `workout_exercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workout_exercise" DROP CONSTRAINT "workout_exercise_pkey",
DROP COLUMN "load",
DROP COLUMN "reps",
DROP COLUMN "sets",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "workout_exercise_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "workout_exercise_sets" (
    "id" SERIAL NOT NULL,
    "reps" SMALLINT NOT NULL,
    "load" SMALLINT NOT NULL,
    "workout_exercise_id" INTEGER NOT NULL,

    CONSTRAINT "workout_exercise_sets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workout_exercise_sets" ADD CONSTRAINT "workout_exercise_sets_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
