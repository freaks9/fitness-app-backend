import { FastifyInstance } from 'fastify';
import { prisma } from '../db';

// const prisma = new PrismaClient(); // Removed

export default async function mealLogRoutes(fastify: FastifyInstance) {
    fastify.post('/meal', async (request, reply) => {
        const { userId, barcode, quantity, mealType, date, name, calories, protein, fat, carbs } = request.body as {
            userId: string;
            barcode: string;
            quantity: number;
            mealType: string;
            date?: string;
            name?: string;
            calories?: number;
            protein?: number;
            fat?: number;
            carbs?: number;
        };

        if (!userId || !barcode || !quantity || !mealType) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            // Verify or Create product
            let product = await prisma.foodProduct.findUnique({
                where: { barcode }
            });

            if (!product) {
                // If nutrients are provided, create the product on the fly
                if (name && calories !== undefined) {
                    product = await prisma.foodProduct.create({
                        data: {
                            barcode,
                            name: name,
                            calories: calories,
                            protein: protein || 0,
                            fat: fat || 0,
                            carbs: carbs || 0,
                            source: barcode.startsWith('manual_') ? 'manual' : 'managed'
                        }
                    });
                } else {
                    return reply.code(404).send({ error: 'Product not found and no data provided to create it' });
                }
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

            dailyLogs.forEach((item: any) => {
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
        const dateStr = new Date().toISOString().split('T')[0];
        return fetchMealsForDate(userId, dateStr, reply);
    });

    fastify.get('/:userId/date/:dateStr', async (request, reply) => {
        const { userId, dateStr } = request.params as { userId: string, dateStr: string };
        return fetchMealsForDate(userId, dateStr, reply);
    });

    async function fetchMealsForDate(userId: string, dateStr: string, reply: any) {
        try {
            const date = new Date(dateStr);
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
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

            const meals = dailyLogs.map((log: any) => {
                if (!log.foodProduct) {
                    return {
                        id: log.id,
                        name: 'Unknown Item',
                        calories: 0,
                        protein: 0,
                        fat: 0,
                        carbs: 0,
                        mealType: log.mealType || 'snack',
                        date: log.date.toISOString().split('T')[0]
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
                    mealType: log.mealType,
                    date: log.date.toISOString().split('T')[0]
                };
            });

            return { meals };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    }

    fastify.delete('/meal', async (request, reply) => {
        const { mealId, userId, date } = request.body as { mealId: string | number, userId?: string, date?: string };

        try {
            // First try deleting by ID (backend primary key)
            if (typeof mealId === 'number' || (!isNaN(Number(mealId)) && String(mealId).length < 10)) {
                await prisma.mealLog.delete({
                    where: { id: Number(mealId) }
                });
                return { message: 'Meal deleted successfully' };
            }

            // Fallback: If mealId is a frontend temporary ID (like a UUID or large timestamp)
            // we try to find the meal by userId, date, and other properties if provided.
            if (userId && date) {
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);

                // This is a fuzzy match fallback for un-synced IDs
                // In a perfect world, the client always has the numeric ID.
                const logs = await prisma.mealLog.findMany({
                    where: {
                        userId,
                        date: { gte: startOfDay, lte: endOfDay }
                    },
                    orderBy: { id: 'desc' }
                });

                if (logs.length > 0) {
                    // Try to delete the most recent one if we can't match ID
                    await prisma.mealLog.delete({
                        where: { id: logs[0].id }
                    });
                    return { message: 'Meal deleted using fuzzy match' };
                }
            }

            return reply.code(400).send({ error: 'Meal ID invalid and no context for fuzzy delete' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete meal' });
        }
    });

    fastify.delete('/meal/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            await prisma.mealLog.delete({
                where: { id: parseInt(id) }
            });
            return { message: 'Meal deleted successfully' };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete meal' });
        }
    });

    // Delete all logs for a specific food (Clear History Item)
    fastify.delete('/history/:userId/:barcode', async (request, reply) => {
        const { userId, barcode } = request.params as { userId: string, barcode: string };
        try {
            await prisma.mealLog.deleteMany({
                where: { userId, foodId: barcode }
            });
            return { message: 'History item deleted successfully' };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete history item' });
        }
    });
}

