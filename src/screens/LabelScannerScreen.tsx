import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AILoadingScreen } from '../components/AILoadingScreen';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { useMealAnalysis } from '../hooks/useMealAnalysis';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { UsageLimitService } from '../services/UsageLimitService';

const LabelScannerScreen = ({ navigation }: any) => {
    const isFocused = useIsFocused();
    const { t } = useLanguageContext();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);
    const { analyzeLabelImage, loading } = useMealAnalysis();
    const [isScanning, setIsScanning] = useState(false);
    const { showAdIfReady } = useInterstitialAd();
    const { showRewardedAd } = useRewardedAd();
    const { profile } = useUser();

    const showLimitAlert = async () => {
        const adWatchCount = await UsageLimitService.getAdWatchCount();
        const canWatchAd = await UsageLimitService.canWatchAd();

        if (canWatchAd) {
            Alert.alert(
                t('limitReachedTitle') || '無料枠の制限',
                (t('limitReachedMsg') || '本日の無料解析枠（3回）を使い切りました。プレミアムプランに加入するか、動画広告を見てあと1回分を無料で開放しますか？\n（現在：{{count}}/3回の動画視聴済み）').replace('{{count}}', adWatchCount.toString()),
                [
                    { text: t('cancel'), style: 'cancel' },
                    {
                        text: t('watchAd') || '動画を見て開放',
                        onPress: () => {
                            const success = showRewardedAd(async () => {
                                await UsageLimitService.grantReward();
                                Alert.alert(t('success'), t('rewardGranted') || '解析枠が1回分開放されました！');
                            });
                            if (!success) {
                                Alert.alert(t('error'), t('adNotReady') || '動画の準備ができていません。しばらく待ってから再度お試しください。');
                            }
                        }
                    },
                    {
                        text: t('upgradeToPremium') || 'プレミアムプランへ',
                        onPress: () => navigation.navigate('Settings')
                    }
                ]
            );
        } else {
            Alert.alert(
                t('limitReachedTitle') || '無料枠の制限',
                t('allLimitsReachedMsg') || '本日の全ての無料枠を使い切りました。制限なしで利用するにはプレミアムプランへ加入してください。',
                [
                    { text: t('cancel'), style: 'cancel' },
                    {
                        text: t('upgradeToPremium') || 'プレミアムプランへ',
                        onPress: () => navigation.navigate('Settings')
                    }
                ]
            );
        }
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>{t('permissionRequired')}</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>続ける</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current && !isScanning) {
            setIsScanning(true);
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: false, // No need for base64
                    quality: 0.8,
                });

                if (photo.uri) {
                    const canUse = await UsageLimitService.canUseAI(profile.isPremium || false);
                    if (!canUse) {
                        showLimitAlert();
                        setIsScanning(false);
                        return;
                    }

                    // Pass URI to analyzeLabelImage
                    const analysis = await analyzeLabelImage(photo.uri);
                    if (analysis) {
                        await UsageLimitService.incrementUsage();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAdIfReady(() => {
                            navigation.navigate('MealEntry', {
                                prefilledName: analysis.food_name || '',
                                prefilledCalories: analysis.calories || '',
                                prefilledProtein: analysis.protein || '',
                                prefilledFat: analysis.fat || '',
                                prefilledCarbs: analysis.carbs || '',
                                imageUri: photo.uri,
                                scannedBarcode: (navigation.getState().routes.find((r: any) => r.name === 'LabelScanner')?.params as any)?.scannedBarcode
                            });
                        });
                    }
                }
            } catch (error) {
                console.error(error);
                Alert.alert(t('error'), 'Failed to scan label.');
            } finally {
                setIsScanning(false);
            }
        }
    };

    return (
        <View style={styles.container}>
            {isFocused && <CameraView style={styles.camera} ref={cameraRef}>
                <View style={styles.overlay}>
                    <View style={styles.guideFrame} />
                    <Text style={styles.guideText}>{t('scanLabel')}</Text>
                </View>

                {!(loading || isScanning) && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="close-circle" size={50} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </CameraView>}
            <AILoadingScreen visible={loading || isScanning} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
        lineHeight: 24,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideFrame: {
        width: 280,
        height: 180,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    guideText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30, // Space between capture and close button
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
    permissionButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        alignSelf: 'center',
    },
    permissionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    closeButton: {
        marginBottom: 20,
    },
});

export default LabelScannerScreen;
