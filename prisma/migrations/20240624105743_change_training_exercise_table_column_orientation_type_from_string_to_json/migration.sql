/*
  Warnings:

  - The `orientations` column on the `routine` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `orientations` column on the `training_exercise` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "routine" DROP COLUMN "orientations",
ADD COLUMN     "orientations" JSONB;

-- AlterTable
ALTER TABLE "training_exercise" DROP COLUMN "orientations",
ADD COLUMN     "orientations" JSONB;
