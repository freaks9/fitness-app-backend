import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { analyzeLabel, analyzeMeal } from '../services/foodApiService';

export const useMealAnalysis = () => {
    const { t } = useLanguageContext();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);

    const resizeImage = async (base64Image: string): Promise<string> => {
        try {
            // Create a temporary URI from base64 (this part assumes we have the URI, but we only have base64 here)
            // Wait, we need the URI for manipulateAsync.
            // Let's check how analyzeImage is called. It's called with base64 in ScannerScreen.
            // ScannerScreen gets base64 from takePictureAsync.
            // We should modify takePictureAsync in ScannerScreen to just return URI, or handle it here if we can.
            // Actually, manipulating base64 directly is tricky without writing to file.
            // Ideally, we should receive the URI in this hook, resize it, and THEN get base64.

            // However, to keep changes minimal, let's look at ScannerScreen.
            // ScannerScreen calls: const analysis = await analyzeImage(photo.base64);
            // Better to change ScannerScreen to pass URI and let this hook handle the rest?
            // Or change ScannerScreen to do the manipulation.

            // Let's implement a helper here that takes a URI, but the current function signature takes base64.
            // If we receive base64, we can't easily use expo-image-manipulator without saving it first.
            // Strategy change: We will rely on ScannerScreen to pass the URI.
            // But wait, analyzeImage argument is `base64Image`.

            // Let's update `analyzeImage` to accept `imageUri` as well, or just `imageUri`.
            // If we change the signature, we need to update ScannerScreen.
            return base64Image;
        } catch (error) {
            console.error("Resize error", error);
            return base64Image;
        }
    };

    // We need to change the interface to accept URI for better performance and manipulation support.
    const analyzeImage = async (imageUri: string, isBase64 = false) => {
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

    const analyzeLabelImage = async (imageUri: string, isBase64 = false) => {
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
