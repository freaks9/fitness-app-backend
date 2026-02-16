
// Service to interact to API Ninjas (or similar)
// API Key would normally be in .env, but for now we might need to ask user or use a demo key/mock if not available.
// Docs: https://api-ninjas.com/api/caloriesburned

const API_KEY = 'YOUR_API_KEY_HERE'; // User needs to provide this or we use a placeholder

export interface ApiExerciseItem {
    name: string;
    calories_per_hour: number;
    duration_minutes: number;
    total_calories: number;
}

export const searchExampleExercisesItems = async (query: string, weightKg: number = 70): Promise<ApiExerciseItem[]> => {
    // Mock data for development if no key is present or quota exceeded
    // In a real scenario, fetch from: https://api.api-ninjas.com/v1/caloriesburned?activity=query&weight=weightKg

    console.log(`Searching API for: ${query}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock Response based on query
    if (!query) return [];

    const mockDb: ApiExerciseItem[] = [
        { name: 'Running (jogging)', calories_per_hour: 400, duration_minutes: 60, total_calories: 400 },
        { name: 'Cycling', calories_per_hour: 300, duration_minutes: 60, total_calories: 300 },
        { name: 'Swimming', calories_per_hour: 500, duration_minutes: 60, total_calories: 500 },
        { name: 'Hiking', calories_per_hour: 350, duration_minutes: 60, total_calories: 350 },
        { name: 'Aerobics', calories_per_hour: 450, duration_minutes: 60, total_calories: 450 },
    ];

    return mockDb.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
};

// Actual implementation if Key is provided
export const fetchCaloriesBurnedFromApi = async (activity: string, weightLb: number = 160): Promise<ApiExerciseItem[]> => {
    const url = `https://api.api-ninjas.com/v1/caloriesburned?activity=${activity}&weight=${weightLb}`;
    try {
        const response = await fetch(url, {
            headers: {
                'X-Api-Key': API_KEY
            }
        });
        if (!response.ok) {
            console.warn('API Request failed', response.status);
            return [];
        }
        return await response.json();
    } catch (e) {
        console.error('API Error', e);
        return [];
    }
};
