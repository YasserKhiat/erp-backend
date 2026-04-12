-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('DISH', 'SERVICE');

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_orderItemId_fkey";

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "glutenFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "halal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vegetarian" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "loyaltyAutoApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loyaltyDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "type" "ReviewType" NOT NULL DEFAULT 'DISH',
ALTER COLUMN "orderItemId" DROP NOT NULL,
ALTER COLUMN "menuItemId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Review_type_createdAt_idx" ON "Review"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

