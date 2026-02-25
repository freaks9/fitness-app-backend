import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { MealAnalysisResult, analyzeLabel, analyzeMeal } from '../services/foodApiService';

export const useMealAnalysis = () => {
    const { t } = useLanguageContext();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MealAnalysisResult | null>(null);

    // We need to change the interface to accept URI for better performance and manipulation support.
    const analyzeImage = async (imageUri: string, isBase64 = false): Promise<MealAnalysisResult | null> => {
        setLoading(true);
        setResult(null);
        try {
            let processedBase64 = imageUri;

            if (!isBase64) {
                const manipResult = await manipulateAsync(
                    imageUri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
                );
                processedBase64 = manipResult.base64 || '';
            }

            const analysis = await analyzeMeal(processedBase64);
            setResult(analysis);
            return analysis;
        } catch (error: any) {
            console.error(error);
            const status = error.response?.status;
            let errorMessage = error.response?.data?.error || error.response?.data?.message || t('failedToAnalyze');

            if (status === 503 || errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('Busy')) {
                Alert.alert(
                    t('serviceBusy') || 'AI Service Busy',
                    t('serviceBusyMessage') || 'The AI service is currently experiencing high traffic (Google Gemini 503). Please try again later or use Barcode/Manual entry.'
                );
            } else {
                Alert.alert(t('error'), errorMessage);
            }
            return null;
        } finally {
            setLoading(false);
        }
    };

    const analyzeLabelImage = async (imageUri: string, isBase64 = false): Promise<MealAnalysisResult | null> => {
        setLoading(true);
        setResult(null);
        try {
            let processedBase64 = imageUri;

            if (!isBase64) {
                const manipResult = await manipulateAsync(
                    imageUri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
                );
                processedBase64 = manipResult.base64 || '';
            }

            const analysis = await analyzeLabel(processedBase64);
            setResult(analysis);
            return analysis;
        } catch (error: any) {
            console.error(error);
            Alert.alert(t('error'), t('failedToAnalyze'));
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
