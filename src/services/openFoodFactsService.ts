import axios from 'axios';

export interface ScannedFood {
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    brand?: string;
    servingSize?: string;
}

const BASE_URL = 'https://world.openfoodfacts.org/api/v0/product/';

export const scanBarcode = async (barcode: string): Promise<ScannedFood | null> => {
    try {
        const response = await axios.get(`${BASE_URL}${barcode}.json`);

        if (response.data && response.data.status === 1) {
            const product = response.data.product;
            const nutriments = product.nutriments;

            // Extract data, handling potential missing fields safely
            // Nutriments are usually per 100g/100ml
            return {
                name: product.product_name || 'Unknown Product',
                calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
                protein: nutriments['protein_100g'] || nutriments['protein'] || 0,
                fat: nutriments['fat_100g'] || nutriments['fat'] || 0,
                carbs: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0,
                brand: product.brands,
                servingSize: product.serving_size
            };
        }
        return null;
    } catch (error) {
        console.error('OpenFoodFacts API Error:', error);
        return null; // Return null on error or not found
    }
};

export const searchProducts = async (query: string): Promise<ScannedFood[]> => {
    try {
        const response = await axios.get(`https://world.openfoodfacts.org/cgi/search.pl`, {
            params: {
                search_terms: query,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: 20
            }
        });

        if (response.data && response.data.products) {
            return response.data.products.map((product: any) => {
                const nutriments = product.nutriments || {};
                return {
                    name: product.product_name || 'Unknown Product',
                    calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
                    protein: nutriments['protein_100g'] || nutriments['protein'] || 0,
                    fat: nutriments['fat_100g'] || nutriments['fat'] || 0,
                    carbs: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0,
                    brand: product.brands,
                    servingSize: product.serving_size
                };
            });
        }
        return [];
    } catch (error) {
        console.error('OpenFoodFacts Search Error:', error);
        return [];
    }
};
