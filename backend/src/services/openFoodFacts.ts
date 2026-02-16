import axios from 'axios';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
// User-Agent is required by Open Food Facts
const USER_AGENT = 'FitnessApp/1.0 (shinichiro@example.com) - Educational Project';

export interface ProductData {
    product_name: string;
    nutriments: {
        'energy-kcal_100g'?: number;
        proteins_100g?: number;
        fat_100g?: number;
        carbohydrates_100g?: number;
    };
}

export const fetchProductFromOpenFoodFacts = async (barcode: string): Promise<ProductData | null> => {
    try {
        const response = await axios.get(`${BASE_URL}/${barcode}`, {
            headers: {
                'User-Agent': USER_AGENT
            }
        });

        if (response.data && response.data.product) {
            // Extract only necessary fields
            const product = response.data.product;
            return {
                product_name: product.product_name || 'Unknown Product',
                nutriments: {
                    'energy-kcal_100g': product.nutriments?.['energy-kcal_100g'],
                    proteins_100g: product.nutriments?.proteins_100g,
                    fat_100g: product.nutriments?.fat_100g,
                    carbohydrates_100g: product.nutriments?.carbohydrates_100g
                }
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching product ${barcode}:`, error);
        return null;
    }
};

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

export const searchProductsFromOpenFoodFacts = async (query: string): Promise<ProductData[] & { barcode: string }[]> => {
    try {
        const response = await axios.get(SEARCH_URL, {
            params: {
                search_terms: query,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: 20
            },
            headers: {
                'User-Agent': USER_AGENT
            }
        });

        if (response.data && response.data.products) {
            return response.data.products.map((product: any) => ({
                barcode: product.code || '',
                product_name: product.product_name || 'Unknown',
                nutriments: {
                    'energy-kcal_100g': product.nutriments?.['energy-kcal_100g'] || 0,
                    proteins_100g: product.nutriments?.proteins_100g || 0,
                    fat_100g: product.nutriments?.fat_100g || 0,
                    carbohydrates_100g: product.nutriments?.carbohydrates_100g || 0
                }
            })).filter((p: any) => p.barcode !== '');
        }
        return [];
    } catch (error) {
        console.error(`Error searching products ${query}:`, error);
        return [];
    }
};
