-- CreateTable
CREATE TABLE "FormulaBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormulaBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaBundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FormulaBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormulaBundle_name_key" ON "FormulaBundle"("name");

-- CreateIndex
CREATE INDEX "FormulaBundle_isAvailable_idx" ON "FormulaBundle"("isAvailable");

-- CreateIndex
CREATE INDEX "FormulaBundleItem_bundleId_idx" ON "FormulaBundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "FormulaBundleItem_menuItemId_idx" ON "FormulaBundleItem"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaBundleItem_bundleId_menuItemId_key" ON "FormulaBundleItem"("bundleId", "menuItemId");

-- AddForeignKey
ALTER TABLE "FormulaBundleItem" ADD CONSTRAINT "FormulaBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "FormulaBundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaBundleItem" ADD CONSTRAINT "FormulaBundleItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
