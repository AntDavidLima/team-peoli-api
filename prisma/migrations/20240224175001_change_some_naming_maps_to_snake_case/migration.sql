/*
  Warnings:

  - You are about to drop the column `routineId` on the `training` table. All the data in the column will be lost.
  - You are about to drop the column `restTime` on the `training_exercise` table. All the data in the column will be lost.
  - You are about to drop the `Routine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "muscle_group" DROP CONSTRAINT "muscle_group_routine_id_fkey";

-- DropForeignKey
ALTER TABLE "training" DROP CONSTRAINT "training_routineId_fkey";

-- AlterTable
ALTER TABLE "training" DROP COLUMN "routineId",
ADD COLUMN     "routine_id" INTEGER;

-- AlterTable
ALTER TABLE "training_exercise" DROP COLUMN "restTime",
ADD COLUMN     "rest_time" INTEGER;

-- DropTable
DROP TABLE "Routine";

-- CreateTable
CREATE TABLE "routine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "orientations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "muscle_group" ADD CONSTRAINT "muscle_group_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
