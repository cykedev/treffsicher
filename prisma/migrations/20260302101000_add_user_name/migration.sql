-- Add optional display name for users.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "name" TEXT;
