-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccountType" ADD VALUE 'CHECKING';
ALTER TYPE "AccountType" ADD VALUE 'DEBIT_CARD';
ALTER TYPE "AccountType" ADD VALUE 'CRYPTO_EXCHANGE';
ALTER TYPE "AccountType" ADD VALUE 'CRYPTO_WALLET';
ALTER TYPE "AccountType" ADD VALUE 'MORTGAGE';
ALTER TYPE "AccountType" ADD VALUE 'BOND';
ALTER TYPE "AccountType" ADD VALUE 'LIFE_INSURANCE';
ALTER TYPE "AccountType" ADD VALUE 'OVERDRAFT';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "iconColor" TEXT,
ADD COLUMN     "photoUrl" TEXT;
