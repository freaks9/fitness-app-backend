-- CreateTable
CREATE TABLE "FoodProduct" (
    "barcode" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "calories" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "mealType" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "FoodProduct" ("barcode") ON DELETE RESTRICT ON UPDATE CASCADE
);
