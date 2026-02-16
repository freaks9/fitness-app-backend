import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;
const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

let accessToken: string | null = null;
let tokenExpiration: number = 0;

export const getAccessToken = async (): Promise<string | null> => {
    if (accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('FatSecret credentials missing');
        return null;
    }

    try {
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const response = await axios.post(TOKEN_URL, 'grant_type=client_credentials&scope=basic', {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.access_token) {
            accessToken = response.data.access_token;
            tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
            return accessToken;
        }
        return null;
    } catch (error) {
        console.error('Error authenticating with FatSecret:', error);
        return null;
    }
};

export interface FatSecretProduct {
    food_id: string;
    food_name: string;
    food_description: string; // contains calories, fat, etc string
    brand_name?: string;
}

export const searchFatSecret = async (query: string): Promise<FatSecretProduct[]> => {
    const token = await getAccessToken();
    if (!token) return [];

    try {
        const params = new URLSearchParams({
            method: 'foods.search',
            search_expression: query,
            format: 'json',
            max_results: '20'
        });

        const response = await axios.post(API_URL, params.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;
        if (data.foods && data.foods.food) {
            return Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error searching FatSecret:', error);
        return [];
    }
};

export const getFoodDetails = async (foodId: string) => {
    const token = await getAccessToken();
    if (!token) return null;

    try {
        const params = new URLSearchParams({
            method: 'food.get.v2',
            food_id: foodId,
            format: 'json'
        });

        const response = await axios.post(API_URL, params.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return response.data.food;
    } catch (error) {
        console.error('Error getting food details:', error);
        return null;
    }
};
