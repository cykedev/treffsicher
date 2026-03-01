-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "favouriteDisciplineId" TEXT;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'User_favouriteDisciplineId_fkey'
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_favouriteDisciplineId_fkey"
        FOREIGN KEY ("favouriteDisciplineId")
        REFERENCES "Discipline"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END
$$;
