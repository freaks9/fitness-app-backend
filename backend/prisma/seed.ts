
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const japaneseFoods = [
    // Convenience Store - Onigiri / Rice
    { barcode: '4902102000010', name: 'おにぎり（鮭）', calories: 180, protein: 4.5, fat: 0.5, carbs: 38, source: 'seed_jp' },
    { barcode: '4902102000027', name: 'おにぎり（ツナマヨ）', calories: 230, protein: 5.0, fat: 8.0, carbs: 36, source: 'seed_jp' },
    { barcode: '4902102000034', name: 'おにぎり（梅）', calories: 170, protein: 3.5, fat: 0.2, carbs: 37, source: 'seed_jp' },
    { barcode: '4902102000041', name: '納豆巻き', calories: 190, protein: 6.0, fat: 1.5, carbs: 38, source: 'seed_jp' },

    // Convenience Store - Bread
    { barcode: '4901234567890', name: 'メロンパン', calories: 380, protein: 7.0, fat: 12.0, carbs: 60, source: 'seed_jp' },
    { barcode: '4901234567891', name: 'カレーパン', calories: 350, protein: 6.5, fat: 18.0, carbs: 40, source: 'seed_jp' },
    { barcode: '4901234567892', name: 'サンドイッチ（ミックス）', calories: 320, protein: 10.0, fat: 15.0, carbs: 35, source: 'seed_jp' },

    // Convenience Store - Salad Chicken
    { barcode: '4901234567900', name: 'サラダチキン（プレーン）', calories: 115, protein: 24.0, fat: 1.5, carbs: 1.0, source: 'seed_jp' },
    { barcode: '4901234567901', name: 'サラダチキン（ハーブ）', calories: 120, protein: 23.5, fat: 1.8, carbs: 1.2, source: 'seed_jp' },

    // Common Dishes
    { barcode: 'jp_dish_001', name: '牛丼（並）', calories: 730, protein: 22.0, fat: 28.0, carbs: 95, source: 'seed_jp' },
    { barcode: 'jp_dish_002', name: 'カレーライス', calories: 850, protein: 20.0, fat: 30.0, carbs: 120, source: 'seed_jp' },
    { barcode: 'jp_dish_003', name: '醤油ラーメン', calories: 500, protein: 18.0, fat: 15.0, carbs: 70, source: 'seed_jp' },
    { barcode: 'jp_dish_004', name: '豚骨ラーメン', calories: 650, protein: 22.0, fat: 25.0, carbs: 80, source: 'seed_jp' },
    { barcode: 'jp_dish_005', name: 'かけうどん', calories: 350, protein: 10.0, fat: 2.0, carbs: 70, source: 'seed_jp' },
    { barcode: 'jp_dish_006', name: '天ぷらそば', calories: 480, protein: 14.0, fat: 18.0, carbs: 65, source: 'seed_jp' },
    { barcode: 'jp_dish_007', name: '親子丼', calories: 680, protein: 25.0, fat: 18.0, carbs: 100, source: 'seed_jp' },
    { barcode: 'jp_dish_008', name: 'カツ丼', calories: 950, protein: 30.0, fat: 35.0, carbs: 120, source: 'seed_jp' },

    // Fast Food
    { barcode: 'jp_ff_001', name: 'ハンバーガー', calories: 260, protein: 13.0, fat: 9.0, carbs: 31, source: 'seed_jp' },
    { barcode: 'jp_ff_002', name: 'チーズバーガー', calories: 310, protein: 16.0, fat: 13.0, carbs: 32, source: 'seed_jp' },
    { barcode: 'jp_ff_003', name: 'フライドポテト（M）', calories: 410, protein: 5.0, fat: 20.0, carbs: 50, source: 'seed_jp' },
    { barcode: 'jp_ff_004', name: 'ナゲット（5ピース）', calories: 230, protein: 13.0, fat: 14.0, carbs: 12, source: 'seed_jp' },

    // Drinks
    { barcode: '4902102001', name: 'コーラ（500ml）', calories: 225, protein: 0, fat: 0, carbs: 56, source: 'seed_jp' },
    { barcode: '4902102002', name: '緑茶（500ml）', calories: 0, protein: 0, fat: 0, carbs: 0, source: 'seed_jp' },
    { barcode: '4902102003', name: 'カフェラテ（240ml）', calories: 120, protein: 4.0, fat: 5.0, carbs: 15, source: 'seed_jp' },
];

async function main() {
    console.log(`Start seeding...`);

    for (const food of japaneseFoods) {
        const product = await prisma.foodProduct.upsert({
            where: { barcode: food.barcode },
            update: {},
            create: food,
        });
        console.log(`Created product with id: ${product.barcode}`);
    }

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
