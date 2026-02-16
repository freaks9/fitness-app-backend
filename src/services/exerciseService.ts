
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExerciseLog {
    id: string;
    exerciseId: string;
    name: string;
    durationMinutes: number;
    caloriesBurned: number;
    date: string; // ISO date string YYYY-MM-DD
    timestamp: number;
}

// METs * Weight(kg) * (Time(min) / 60) * 1.05
export const calculateBurnedCalories = (
    mets: number,
    weightKg: number,
    durationMinutes: number
): number => {
    if (!weightKg) weightKg = 60; // Default fallback if weight is missing
    return Math.round(mets * weightKg * (durationMinutes / 60) * 1.05);
};

export const saveExerciseLog = async (log: ExerciseLog): Promise<void> => {
    try {
        const dateStr = log.date;
        const storageKey = `exercises_${dateStr}`;

        const existingLogsJson = await AsyncStorage.getItem(storageKey);
        const existingLogs: ExerciseLog[] = existingLogsJson ? JSON.parse(existingLogsJson) : [];

        const updatedLogs = [...existingLogs, log];
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedLogs));
    } catch (e) {
        console.error('Failed to save exercise log', e);
        throw e;
    }
};

export const getExerciseLogs = async (dateStr: string): Promise<ExerciseLog[]> => {
    try {
        const storageKey = `exercises_${dateStr}`;
        const logsJson = await AsyncStorage.getItem(storageKey);
        return logsJson ? JSON.parse(logsJson) : [];
    } catch (e) {
        console.error('Failed to get exercise logs', e);
        return [];
    }
};

export const deleteExerciseLog = async (dateStr: string, logId: string): Promise<void> => {
    try {
        const storageKey = `exercises_${dateStr}`;
        const logs = await getExerciseLogs(dateStr);
        const updatedLogs = logs.filter(log => log.id !== logId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedLogs));
    } catch (e) {
        console.error('Failed to delete exercise log', e);
        throw e;
    }
};
