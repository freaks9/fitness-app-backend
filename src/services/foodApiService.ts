import axios from 'axios';
import { Platform } from 'react-native';

// --- PRODUCTION BACKEND URL ---
// Replace with your actual production backend URL (e.g., https://your-backend.onrender.com/api)
const PRODUCTION_URL = 'https://fitness-app-ai-backend.onrender.com/api';

const getBaseUrl = () => {
    // In development mode, always use the local server
    if (__DEV__) {
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:3000/api/';
        }
        return 'http://localhost:3000/api/';
    }

    // Production logic
    // If the URL is still a placeholder or known non-functional URL, fallback to a safe state or alert the developer
    let url = PRODUCTION_URL;
    if (!url || url.includes('onrender.com') && url.includes('fitness-app-ai-backend')) {
        // WARNING: This URL is currently 404. Ensure it is updated before final submission.
        console.warn('Production Backend URL is not configured. Please update in foodApiService.ts');
    }

    return url.endsWith('/') ? url : `${url}/`;
};

const API_URL = getBaseUrl();

const api = axios.create({
    baseURL: API_URL,
    // Render free tier cold starts can take up to 6
    // 0s, so setting to 90s to be safe
    timeout: 90000,
});

export const scanFood = async (barcode: string) => {
    try {
        console.log(`API Request: scanFood(${barcode}) to ${API_URL}`);
        const response = await api.get(`food/scan/${barcode}`);
        return response.data;
    } catch (error) {
        console.error('Scan Error:', error);
        throw error;
    }
};

export const logMeal = async (
    userId: string,
    barcode: string,
    quantity: number,
    mealType: string,
    date?: string,
    name?: string,
    calories?: number,
    protein?: number,
    fat?: number,
    carbs?: number
) => {
    try {
        console.log(`API Request: logMeal for userId=${userId}, barcode=${barcode} to ${API_URL}`);
        const response = await api.post('logs/meal', {
            userId, barcode, quantity, mealType, date,
            name, calories, protein, fat, carbs
        });
        console.log('API Response: logMeal success');
        return response.data;
    } catch (error) {
        console.error('Log Meal Error:', error);
        throw error;
    }
};

export const getDailyLogs = async (userId: string, date?: string) => {
    try {
        const endpoint = date ? `logs/${userId}/date/${date}` : `logs/${userId}/today`;
        console.log(`API Request: getDailyLogs from ${API_URL}${endpoint}`);
        const response = await api.get(endpoint);
        console.log(`API Response: getDailyLogs found ${response.data.meals?.length || 0} meals`);
        return response.data;
    } catch (error) {
        console.error('Get Daily Logs Error:', error);
        throw error;
    }
};

export const searchFood = async (query: string) => {
    try {
        const response = await api.get('food/search', {
            params: { query }
        });
        return response.data;
    } catch (error) {
        console.error('Search Food Error:', error);
        throw error;
    }
};

export interface MealAnalysisResult {
    food_name: string;
    calories: number | string;
    protein: number | string;
    fat: number | string;
    carbs: number | string;
    confidence?: number;
}

export const analyzeMeal = async (base64Image: string): Promise<MealAnalysisResult> => {
    try {
        const response = await api.post('ai/analyze-meal', {
            image: base64Image
        });
        return response.data.analysis;
    } catch (error: any) {
        console.error('Analyze Meal Error:', error.response?.data || error.message);
        throw error;
    }
};

export const analyzeLabel = async (base64Image: string): Promise<MealAnalysisResult> => {
    try {
        const response = await api.post('ai/analyze-label', {
            image: base64Image
        });
        return response.data.analysis;
    } catch (error) {
        console.error('Analyze Label Error:', error);
        throw error;
    }
};

export const createProduct = async (productData: {
    barcode?: string;
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
}) => {
    try {
        const response = await api.post('food/create', productData);
        return response.data;
    } catch (error) {
        console.error('Create Product Error:', error);
        throw error;
    }
};


export const getFoodHistory = async (userId: string) => {
    try {
        const response = await api.get(`food/logs/${userId}/history`);
        return response.data.history;
    } catch (error) {
        console.error('Get Food History Error:', error);
        throw error;
    }
};

export const deleteFoodHistory = async (userId: string, barcode: string) => {
    try {
        const response = await api.delete(`logs/history/${userId}/${barcode}`);
        return response.data;
    } catch (error) {
        console.error('Delete Food History Error:', error);
        throw error;
    }
};

export const getAdvice = async (userId: string, date?: string) => {
    try {
        const url = `ai/advice/${userId}${date ? `?date=${date}` : ''}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error('Get Advice Error:', error);
        throw error;
    }
};

export const deleteMealLog = async (userId: string, date: string, mealId: string | number) => {
    try {
        console.log(`API Request: deleteMealLog mealId=${mealId} to ${API_URL}`);
        const response = await api.delete('logs/meal', {
            data: { userId, date, mealId }
        });
        console.log('API Response: deleteMealLog success');
        return response.data;
    } catch (error) {
        console.error('Delete Meal Log Error:', error);
        throw error;
    }
};

export default api;

