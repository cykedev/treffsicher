CREATE TYPE "HitLocationHorizontalDirection" AS ENUM ('LEFT', 'RIGHT');

CREATE TYPE "HitLocationVerticalDirection" AS ENUM ('HIGH', 'LOW');

ALTER TABLE "TrainingSession"
ADD COLUMN "hitLocationHorizontalMm" DOUBLE PRECISION,
ADD COLUMN "hitLocationHorizontalDirection" "HitLocationHorizontalDirection",
ADD COLUMN "hitLocationVerticalMm" DOUBLE PRECISION,
ADD COLUMN "hitLocationVerticalDirection" "HitLocationVerticalDirection";
