import { FastifyInstance } from 'fastify';
import { prisma } from '../db';

// const prisma = new PrismaClient(); // Removed

export default async function mealLogRoutes(fastify: FastifyInstance) {
    fastify.post('/meal', async (request, reply) => {
        const { userId, barcode, quantity, mealType, date } = request.body as {
            userId: string;
            barcode: string;
            quantity: number;
            mealType: string;
            date?: string;
        };

        if (!userId || !barcode || !quantity || !mealType) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            // Verify product exists
            const product = await prisma.foodProduct.findUnique({
                where: { barcode }
            });

            if (!product) {
                return reply.code(404).send({ error: 'Product not found' });
            }

            // Create Log
            const log = await prisma.mealLog.create({
                data: {
                    userId,
                    foodId: barcode,
                    quantity,
                    mealType,
                    date: date ? new Date(date) : new Date()
                }
            });

            // Calculate Daily Total
            const startOfDay = new Date(log.date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(log.date);
            endOfDay.setHours(23, 59, 59, 999);

            const dailyLogs = await prisma.mealLog.findMany({
                where: {
                    userId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                include: {
                    foodProduct: true
                }
            });

            let totalCalories = 0;
            let totalProtein = 0;
            let totalFat = 0;
            let totalCarbs = 0;

            dailyLogs.forEach(item => {
                const ratio = item.quantity / 100;
                totalCalories += item.foodProduct.calories * ratio;
                totalProtein += item.foodProduct.protein * ratio;
                totalFat += item.foodProduct.fat * ratio;
                totalCarbs += item.foodProduct.carbs * ratio;
            });

            return {
                message: 'Meal logged successfully',
                log,
                dailyTotals: {
                    calories: Math.round(totalCalories),
                    protein: Math.round(totalProtein),
                    fat: Math.round(totalFat),
                    carbs: Math.round(totalCarbs)
                }
            };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    fastify.get('/:userId/today', async (request, reply) => {
        const { userId } = request.params as { userId: string };

        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const dailyLogs = await prisma.mealLog.findMany({
                where: {
                    userId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                include: {
                    foodProduct: true
                }
            });

            const meals = dailyLogs.map(log => {
                if (!log.foodProduct) {
                    // Handle missing product gracefully (shouldn't happen with foreign keys but safety first)
                    return {
                        id: log.id,
                        name: 'Unknown Item',
                        calories: 0,
                        protein: 0,
                        fat: 0,
                        carbs: 0,
                        mealType: log.mealType || 'snack'
                    };
                }
                const ratio = log.quantity / 100;
                return {
                    id: log.id,
                    name: log.foodProduct.name,
                    calories: Math.round(log.foodProduct.calories * ratio),
                    protein: Math.round(log.foodProduct.protein * ratio),
                    fat: Math.round(log.foodProduct.fat * ratio),
                    carbs: Math.round(log.foodProduct.carbs * ratio),
                    mealType: log.mealType
                };
            });

            // Recalculate totals just in case, or trust the client to sum 'meals'.
            // Returning meals array allows client to render the list.

            return { meals };

        } catch (error) {
            fastify.log.error(error);
            console.error('Error in get-today-logs endpoint:', error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
}

