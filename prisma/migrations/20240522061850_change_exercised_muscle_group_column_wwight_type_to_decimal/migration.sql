/*
  Warnings:

  - You are about to alter the column `weight` on the `exercised_muscle_group` table. The data in that column could be lost. The data in that column will be cast from `SmallInt` to `Decimal(3,2)`.

*/
-- AlterTable
ALTER TABLE "exercised_muscle_group" ALTER COLUMN "weight" SET DATA TYPE DECIMAL(3,2);
