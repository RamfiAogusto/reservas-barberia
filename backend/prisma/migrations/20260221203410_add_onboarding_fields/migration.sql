-- AlterTable
ALTER TABLE "barbers" ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
