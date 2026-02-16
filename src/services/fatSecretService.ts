import { encode as btoa } from 'base-64';

export const FATSECRET_CLIENT_ID = '022819555350478cbd6ac4158f05de35';
export const FATSECRET_CLIENT_SECRET = '29642cd1f3d64946a09fbb9ebe1cdf80';

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

let accessToken: string | null = null;
let tokenExpiration: number = 0;

/**
 * Authenticates with FatSecret API using Client Credentials Grant
 */
export const getAccessToken = async (): Promise<string | null> => {
    // If we have a valid token, return it
    if (accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }



    try {
        const credentials = btoa(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`);
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials&scope=basic'
        });

        const data = await response.json();

        if (data.access_token) {
            accessToken = data.access_token;
            // Set expiration slightly before actual expiry (expires_in is in seconds)
            tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;
            return accessToken;
        } else {
            console.error('Failed to get access token:', data);
            return null;
        }
    } catch (error) {
        console.error('Error authenticating with FatSecret:', error);
        return null;
    }
};

/**
 * Helper to perform API search
 */
export const searchFatSecret = async (query: string) => {
    const token = await getAccessToken();
    if (!token) return [];

    try {
        const params = new URLSearchParams({
            method: 'foods.search',
            search_expression: query,
            format: 'json',
            max_results: '20'
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded' // FatSecret REST API typically accepts POST params or signed requests. OAuth2 uses Bearer token.
            },
            // Note: For OAuth2, parameters can be passed in query string or body. 
            // FatSecret documentation says "All requests must be signed... for OAuth 1.0", 
            // but for OAuth 2.0 we just use the Bearer token.
            // Let's try sending parameters in the body for POST.
            body: params.toString()
        });

        const data = await response.json();

        // FatSecret response structure: { foods: { food: [ ... ] } }
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

/**
 * Helper to get detailed food info (PFC)
 * FatSecret search results often don't contain full macro details, so we might need `food.get.v2`
 */
export const getFoodDetails = async (foodId: string) => {
    const token = await getAccessToken();
    if (!token) return null;

    try {
        const params = new URLSearchParams({
            method: 'food.get.v2',
            food_id: foodId,
            format: 'json'
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const data = await response.json();
        return data.food;

    } catch (error) {
        console.error('Error getting food details:', error);
        return null;
    }
};
