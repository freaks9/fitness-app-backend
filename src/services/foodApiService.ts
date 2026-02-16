import axios from 'axios';
import { Platform } from 'react-native';

// Use localhost for iOS Simulator, 10.0.2.2 for Android Emulator
// For physical devices, you need your machine's LAN IP
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

export const scanFood = async (barcode: string) => {
    try {
        const response = await api.get(`/food/scan/${barcode}`);
        return response.data;
    } catch (error) {
        console.error('Scan Error:', error);
        throw error;
    }
};

export const logMeal = async (userId: string, barcode: string, quantity: number, date?: string) => {
    try {
        const response = await api.post('/logs/meal', {
            userId,
            barcode,
            quantity,
            date
        });
        return response.data;
    } catch (error) {
        console.error('Log Meal Error:', error);
        throw error;
    }
};

export const getDailyLogs = async (userId: string) => {
    try {
        const response = await api.get(`logs/${userId}/today`);
        return response.data;
    } catch (error) {
        console.error('Get Daily Logs Error:', error);
        throw error;
    }
};

export const searchFood = async (query: string) => {
    try {
        const response = await api.get('/food/search', {
            params: { query }
        });
        return response.data;
    } catch (error) {
        console.error('Search Food Error:', error);
        throw error;
    }
};

export const analyzeMeal = async (base64Image: string) => {
    try {
        const response = await api.post('/analyze-meal', {
            image: base64Image
        });
        return response.data.analysis;
    } catch (error) {
        console.error('Analyze Meal Error:', error);
        throw error;
    }
};

export const analyzeLabel = async (base64Image: string) => {
    try {
        const response = await api.post('/analyze-label', {
            image: base64Image
        });
        return response.data.analysis;
    } catch (error) {
        console.error('Analyze Label Error:', error);
        throw error;
    }
};

export default api;
