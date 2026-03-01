-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "isFavourite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainingGoal" TEXT;
