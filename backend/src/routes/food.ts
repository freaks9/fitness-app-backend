import { FastifyInstance } from 'fastify';
import * as wanakana from 'wanakana';
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
        const { query: queryParam, q } = request.query as { query?: string, q?: string };
        const query = queryParam || q;

        if (!query || query.length < 1) {
            return [];
        }

        try {
            // 1. Search Local DB with Fuzzy Vowels
            // wanakana is imported at top

            // Helper to generate vowel permutations (ramen -> raamen, rameen, raameen)
            const permuteVowels = (str: string): string[] => {
                // vowels and results were unused

                // Simple approach: Double each vowel occurrence one by one
                // For "ramen", indices of 'a' is 1, 'e' is 3.
                // We will just generate a few common patterns: 
                // 1. Double first vowel
                // 2. Double second vowel
                // 3. Double all vowels
                // This is a heuristic.

                // Better: Just regex replace each vowel with "vowel+" and expand? 
                // Too complex for regex.
                // Let's just create a set of candidate romaji strings.

                const candidates = new Set<string>();
                candidates.add(str);

                // Strategy 1: Double every vowel (raamen -> らあめん)
                const allDoubled = str.replace(/[aeiou]/g, (match) => match + match);
                candidates.add(allDoubled);

                // Strategy 2: Insert '-' after every vowel (ra-me-n -> ラーメーン)
                const allDashed = str.replace(/[aeiou]/g, '$&-');
                candidates.add(allDashed);

                // Strategy 3: Insert '-' after FIRST vowel only (ra-men -> ラーメン)
                // This is the most likely match for simple Katakana words like Ramen
                const firstDashed = str.replace(/[aeiou]/, '$&-');
                candidates.add(firstDashed);

                return Array.from(candidates);
            };

            const rawTerms = permuteVowels(query);
            const searchTerms = rawTerms.flatMap(t => [
                t,
                wanakana.toHiragana(t),
                wanakana.toKatakana(t),
                wanakana.toKana(t)
            ]).filter((v, i, a) => v && v.length > 0 && a.indexOf(v) === i);

            console.log('Fuzzy Search Terms:', searchTerms);

            let localResults: any[] = [];
            try {
                localResults = await prisma.foodProduct.findMany({
                    where: {
                        OR: searchTerms.map(term => ({
                            name: {
                                contains: term
                            }
                        }))
                    },
                    take: 50,
                    orderBy: { createdAt: 'desc' }
                });
                console.log(`[DEBUG] Local Search: Found ${localResults.length} items for terms: ${JSON.stringify(searchTerms)}`);
            } catch (dbErr: any) {
                console.error('[DATABASE ERROR] Local search failed:', dbErr.message);
                try {
                    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
                    console.log('[DIAGNOSTIC] Existing tables in public schema:', JSON.stringify(tables));
                } catch (diagErr: any) {
                    console.error('[DIAGNOSTIC ERROR] Failed to list tables:', diagErr.message);
                }
            }

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
                barcode: p.code || p.barcode, // OFF uses 'code' for barcode
                name: p.product_name || "Unknown Product",
                calories: p.nutriments?.['energy-kcal_100g'] || 0,
                protein: p.nutriments?.proteins_100g || 0,
                fat: p.nutriments?.fat_100g || 0,
                carbs: p.nutriments?.carbohydrates_100g || 0,
                source: 'openfoodfacts_search'
            })).filter(p => p.barcode); // Ensure we have a barcode

            // Format FatSecret Results
            // FatSecret "food_description" example: "Per 100g - Calories: 52kcal | Fat: 0.10g | Carbs: 13.00g | Protein: 0.30g"
            // We need to parse this string.
            const formattedFatSecretResults: FormattedProduct[] = fatSecretResults.map((p: any) => {
                const desc = p.food_description || "";

                const parseVal = (str: string, key: string) => {
                    const regex = new RegExp(`${key}:\\s*([0-9\\.]+)`);
                    const match = str.match(regex);
                    const val = match ? parseFloat(match[1]) : 0;
                    return isNaN(val) ? 0 : val;
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

            // 3. Cache results to Local DB (best-effort, don't fail if cache fails)
            const allResultsToCache = [...formattedOffResults, ...formattedFatSecretResults];

            try {
                // Filter out any results that might have missing required fields
                const validResultsToCache = allResultsToCache.filter(p => p.barcode && p.name);

                await Promise.allSettled(validResultsToCache.map(p =>
                    prisma.foodProduct.upsert({
                        where: { barcode: p.barcode },
                        update: {},
                        create: {
                            barcode: p.barcode,
                            name: p.name,
                            calories: p.calories,
                            protein: p.protein,
                            fat: p.fat,
                            carbs: p.carbs,
                            source: p.source
                        }
                    })
                ));
            } catch (cacheErr) {
                console.warn('Cache write failed (non-fatal):', cacheErr);
            }

            // 4. Return Combined / Fresh results
            const allFetchedResults = [...formattedOffResults, ...formattedFatSecretResults];
            const localBarcodes = new Set(localResults.map(p => p.barcode));
            const newResults = allFetchedResults.filter((p: any) => !localBarcodes.has(p.barcode));

            return [...localResults, ...newResults];

        } catch (error) {
            fastify.log.error(error);
            console.error('Search Endpoint Error:', error);
            return reply.code(500).send({ error: 'Search failed' });
        }
    });

    // Endpoint for manual creation if needed
    // Endpoint for manual creation if needed
    fastify.post('/create', async (request, reply) => {
        const { barcode, name, calories, protein, fat, carbs } = request.body as any;

        // Auto-generate barcode if not provided
        const finalBarcode = barcode || `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        try {
            const product = await prisma.foodProduct.upsert({
                where: { barcode: finalBarcode },
                update: {}, // Don't update if exists, just return it
                create: {
                    barcode: finalBarcode,
                    name,
                    calories: parseFloat(calories),
                    protein: parseFloat(protein),
                    fat: parseFloat(fat),
                    carbs: parseFloat(carbs),
                    source: 'manual'
                }
            });
            return product;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: 'Failed to create product' });
        }
    });

    // Get food history (recent unique items)
    fastify.get('/logs/:userId/history', async (request, reply) => {
        const { userId } = request.params as { userId: string };
        console.log(`[API] History requested for user: ${userId}`);
        try {
            const logs = await prisma.mealLog.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 50,
                include: { foodProduct: true }
            });

            console.log(`[API] Found ${logs.length} logs for user ${userId}`);

            // Deduplicate by foodId
            const uniqueFoods = new Map();
            logs.forEach((log: any) => {
                if (log.foodProduct && !uniqueFoods.has(log.foodId)) {
                    uniqueFoods.set(log.foodId, log.foodProduct);
                } else if (!log.foodProduct) {
                    console.warn(`[API] Log ${log.id} has no foodProduct related! foodId: ${log.foodId}`);
                }
            });

            console.log(`[API] Returning ${uniqueFoods.size} unique history items`);
            return { history: Array.from(uniqueFoods.values()) };
        } catch (error) {
            console.error('[API] History Error:', error);
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch history' });
        }
    });
}
