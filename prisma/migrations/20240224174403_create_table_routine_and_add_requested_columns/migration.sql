/*
  Warnings:

  - You are about to drop the column `mesocycle` on the `training` table. All the data in the column will be lost.
  - You are about to drop the column `load` on the `training_exercise` table. All the data in the column will be lost.
  - You are about to drop the `Workout` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `exercised_muscle_group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `training_exercise` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `workout_exercise` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "intensity" AS ENUM ('LIGHT', 'MODERATE', 'VIGOROUS');

-- DropForeignKey
ALTER TABLE "Workout" DROP CONSTRAINT "Workout_student_id_fkey";

-- DropForeignKey
ALTER TABLE "Workout" DROP CONSTRAINT "Workout_training_id_fkey";

-- DropForeignKey
ALTER TABLE "workout_exercise" DROP CONSTRAINT "workout_exercise_workout_id_fkey";

-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "rest_time" INTEGER;

-- AlterTable
ALTER TABLE "exercised_muscle_group" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "muscle_group" ADD COLUMN     "routine_id" INTEGER;

-- AlterTable
ALTER TABLE "training" DROP COLUMN "mesocycle",
ADD COLUMN     "routineId" INTEGER;

-- AlterTable
ALTER TABLE "training_exercise" DROP COLUMN "load",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "orientations" TEXT,
ADD COLUMN     "restTime" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "profile_photo_url" TEXT,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "workout_exercise" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Workout";

-- CreateTable
CREATE TABLE "Routine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "orientations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "feedback" TEXT,
    "intensity" "intensity" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "training_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,

    CONSTRAINT "workout_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "muscle_group" ADD CONSTRAINT "muscle_group_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
