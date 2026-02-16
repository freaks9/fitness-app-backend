import { useState } from 'react';
import { Alert } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { analyzeLabel, analyzeMeal } from '../services/foodApiService';

export const useMealAnalysis = () => {
    const { t } = useLanguageContext();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);

    const analyzeImage = async (base64Image: string) => {
        setLoading(true);
        setResult(null);
        try {
            const analysis = await analyzeMeal(base64Image);
            setResult(analysis);
            return analysis;
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), 'Failed to analyze meal.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const analyzeLabelImage = async (base64Image: string) => {
        setLoading(true);
        setResult(null);
        try {
            const analysis = await analyzeLabel(base64Image);
            setResult(analysis);
            return analysis;
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), 'Failed to analyze label.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        result,
        analyzeImage,
        analyzeLabelImage,
        setResult
    };
};
