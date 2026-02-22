-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('LIBRE', 'PREPAGO', 'PAGO_POST_APROBACION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "autoConfirmAfterPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bookingMode" "BookingMode" NOT NULL DEFAULT 'LIBRE',
ADD COLUMN     "cancellationMinutesBefore" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "noShowWaitMinutes" INTEGER NOT NULL DEFAULT 15;
