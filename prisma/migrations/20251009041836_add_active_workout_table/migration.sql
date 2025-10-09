-- CreateTable
CREATE TABLE "active_workout" (
    "id" SERIAL NOT NULL,
    "day" "day" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "training_id" INTEGER NOT NULL,
    "initial_exercise_id" INTEGER NOT NULL,

    CONSTRAINT "active_workout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "active_workout_user_id_key" ON "active_workout"("user_id");

-- AddForeignKey
ALTER TABLE "active_workout" ADD CONSTRAINT "active_workout_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
