import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import * as fatSecret from '../services/fatSecret';
import { fetchProductFromOpenFoodFacts, searchProductsFromOpenFoodFacts } from '../services/openFoodFacts';

// const prisma = new PrismaClient();

export default async function foodRoutes(fastify: FastifyInstance) {
    fastify.get('/scan/:barcode', async (request, reply) => {
        const { barcode } = request.params as { barcode: string };

        try {
            // 1. Check Local DB
            const localProduct = await prisma.foodProduct.findUnique({
                where: { barcode }
            });

            if (localProduct) {
                return { product: localProduct, source: 'local' };
            }

            // 2. Fetch from External API
            const apiProduct = await fetchProductFromOpenFoodFacts(barcode);

            if (apiProduct) {
                // 3. Save to Local DB
                const savedProduct = await prisma.foodProduct.create({
                    data: {
                        barcode,
                        name: apiProduct.product_name,
                        calories: apiProduct.nutriments['energy-kcal_100g'] || 0,
                        protein: apiProduct.nutriments.proteins_100g || 0,
                        fat: apiProduct.nutriments.fat_100g || 0,
                        carbs: apiProduct.nutriments.carbohydrates_100g || 0,
                        source: 'openfoodfacts'
                    }
                });

                return { product: savedProduct, source: 'api' };
            }

            return reply.code(404).send({ error: 'Product not found' });

        } catch (error) {
            fastify.log.error(error);
            console.error('Error in scan endpoint:', error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // Search Endpoint with Caching
    fastify.get('/search', async (request, reply) => {
        const { query } = request.query as { query: string };

        if (!query || query.length < 1) {
            return [];
        }

        try {
            // 1. Search Local DB first
            const localResults = await prisma.foodProduct.findMany({
                where: {
                    name: {
                        contains: query
                    }
                },
                take: 20
            });

            // If we have enough local results, return them (Cache Hit optimization)
            // DISABLED: To ensure we get FatSecret results even if we have local items
            /*
            if (localResults.length >= 5) {
                return localResults;
            }
            */

            // 2. Fetch from External APIs (Parallel)

            // Define types for results
            type FormattedProduct = {
                barcode: string;
                name: string;
                calories: number;
                protein: number;
                fat: number;
                carbs: number;
                source: string;
                details?: string;
                brand?: string;
            };

            const [offResults, fatSecretResults] = await Promise.all([
                searchProductsFromOpenFoodFacts(query).catch(e => {
                    console.error('OFF Search Error', e);
                    return [];
                }),
                fatSecret.searchFatSecret(query).catch(e => {
                    console.error('FatSecret Search Error', e);
                    return [];
                })
            ]);

            // Format OFF Results
            const formattedOffResults: FormattedProduct[] = offResults.map((p: any) => ({
                barcode: p.barcode,
                name: p.product_name,
                calories: p.nutriments['energy-kcal_100g'] || 0,
                protein: p.nutriments.proteins_100g || 0,
                fat: p.nutriments.fat_100g || 0,
                carbs: p.nutriments.carbohydrates_100g || 0,
                source: 'openfoodfacts_search'
            }));

            // Format FatSecret Results
            // FatSecret "food_description" example: "Per 100g - Calories: 52kcal | Fat: 0.10g | Carbs: 13.00g | Protein: 0.30g"
            // We need to parse this string.
            const formattedFatSecretResults: FormattedProduct[] = fatSecretResults.map((p: any) => {
                const desc = p.food_description || "";

                const parseVal = (str: string, key: string) => {
                    const regex = new RegExp(`${key}:\\s*([0-9\\.]+)`);
                    const match = str.match(regex);
                    return match ? parseFloat(match[1]) : 0;
                };

                return {
                    barcode: `fs_${p.food_id}`, // Fake barcode for FatSecret items
                    name: p.food_name,
                    calories: parseVal(desc, 'Calories'),
                    protein: parseVal(desc, 'Protein'),
                    fat: parseVal(desc, 'Fat'),
                    carbs: parseVal(desc, 'Carbs'),
                    source: 'fatsecret_search',
                    brand: p.brand_name,
                    details: desc
                };
            });

            // 3. Cache results to Local DB
            // We only cache OFF results as they have valid barcodes. 
            // FatSecret items have fake barcodes, so we might skip caching them or cache with custom prefix if we change schema.
            // For now, let's ONLY cache OFF results to avoid polluting DB with fake IDs or handle them gracefully.
            // Actually, caching FatSecret items is good for performance if we use the same ID schema.

            const allResultsToCache = [...formattedOffResults, ...formattedFatSecretResults];

            // Using Promise.all for upserts
            await Promise.all(allResultsToCache.map(p =>
                prisma.foodProduct.upsert({
                    where: { barcode: p.barcode },
                    update: {}, // Don't overwrite if exists
                    create: {
                        barcode: p.barcode,
                        name: p.name,
                        calories: p.calories,
                        protein: p.protein,
                        fat: p.fat,
                        carbs: p.carbs,
                        source: p.source
                    }
                }).catch(err => {
                    // Ignore unique constraint errors
                })
            ));

            // 4. Return Combined / Fresh results
            // Merge: Local + OFF + FatSecret
            // Filter out duplicates.

            const allFetchedResults = [...formattedOffResults, ...formattedFatSecretResults];

            // Filter out items already in localResults (by barcode)
            const localBarcodes = new Set(localResults.map(p => p.barcode));
            const newResults = allFetchedResults.filter(p => !localBarcodes.has(p.barcode));

            return [...localResults, ...newResults];

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Search failed' });
        }
    });

    // Endpoint for manual creation if needed
    fastify.post('/create', async (request, reply) => {
        const { barcode, name, calories, protein, fat, carbs } = request.body as any;

        try {
            const product = await prisma.foodProduct.create({
                data: {
                    barcode,
                    name,
                    calories,
                    protein,
                    fat,
                    carbs,
                    source: 'manual'
                }
            });
            return product;
        } catch {
            return reply.code(400).send({ error: 'Failed to create product' });
        }
    });
}
