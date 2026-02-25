import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Button,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AILoadingScreen } from '../components/AILoadingScreen';
import { useAuth } from '../context/AuthContext';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { useMealAnalysis } from '../hooks/useMealAnalysis';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { UsageLimitService } from '../services/UsageLimitService';
import { logMeal, scanFood } from '../services/foodApiService';

const ScannerScreen = ({ navigation, route }: any) => {
    const isFocused = useIsFocused();
    const { t } = useLanguageContext();
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [scannedProduct, setScannedProduct] = useState<any | null>(null);
    const [facing] = useState<CameraType>('back');
    const { date, mealType, mode: initialMode } = route.params || {};
    const [mode, setMode] = useState<'barcode' | 'ai'>(initialMode === 'ai' ? 'ai' : 'barcode');

    const cameraRef = useRef<CameraView>(null);
    const { analyzeImage, loading: aiLoading } = useMealAnalysis();
    const { showAdIfReady } = useInterstitialAd();
    const { showRewardedAd, loaded: rewardLoaded } = useRewardedAd();
    const { profile } = useUser();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (scanned || loading || aiLoading || mode === 'ai') return;

        setScanned(true);
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const dateStr = date || new Date().toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            if (isToday) {
                const canUse = await UsageLimitService.canUseAI(profile.isPremium || false);
                if (!canUse) {
                    showLimitAlert();
                    setLoading(false);
                    return;
                }
            }

            const result = await scanFood(data);
            if (result && result.product) {
                if (isToday) {
                    await UsageLimitService.incrementUsage();
                }
                const p = result.product;
                const hasNutrition = (p.calories > 0 || p.protein > 0 || p.fat > 0 || p.carbs > 0);

                if (!hasNutrition) {
                    Alert.alert(
                        t('attention') || "Attention",
                        t('nutritionEmpty') || "Nutrition data is empty. Would you like to enter it manually?",
                        [
                            { text: t('cancel'), onPress: () => setScanned(false), style: "cancel" },
                            {
                                text: t('manualEntry') || "Manual Entry",
                                onPress: () => {
                                    setScanned(false);
                                    navigation.navigate('MealEntry', {
                                        prefilledName: p.name,
                                        prefilledCalories: p.calories,
                                        prefilledProtein: p.protein,
                                        prefilledFat: p.fat,
                                        prefilledCarbs: p.carbs,
                                        date,
                                        mealType,
                                    });
                                }
                            }
                        ]
                    );
                } else {
                    setScanned(false);
                    showAdIfReady(() => {
                        navigation.navigate('MealEntry', {
                            prefilledName: p.name,
                            prefilledCalories: p.calories,
                            prefilledProtein: p.protein,
                            prefilledFat: p.fat,
                            prefilledCarbs: p.carbs,
                            date,
                            mealType,
                            scannedBarcode: data
                        });
                    });
                }
            } else {
                throw new Error("Product not found");
            }
        } catch (error) {
            console.error(error);
            Alert.alert(
                t('productNotFound') || "Product Not Found",
                t('scanLabelPrompt') || "Would you like to scan the nutrition label to add this product to the database?",
                [
                    { text: t('cancel'), onPress: () => setScanned(false), style: 'cancel' },
                    {
                        text: t('scanLabel') || "Scan Label",
                        onPress: () => {
                            setScanned(false);
                            navigation.navigate('LabelScanner', {
                                date,
                                mealType,
                                scannedBarcode: data
                            });
                        }
                    }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAddFood = async () => {
        if (!scannedProduct || !date || !mealType) return;

        if (user) {
            try {
                await logMeal(user.id, scannedProduct.barcode, 100, new Date().toISOString());
            } catch (e) {
                console.error('Backend log failed', e);
            }
        }

        const newMeal = {
            name: scannedProduct.name,
            calories: scannedProduct.calories,
            protein: scannedProduct.protein,
            fat: scannedProduct.fat,
            carbs: scannedProduct.carbs,
            mealType: mealType,
            id: Date.now(),
        };

        try {
            const storedMeals = await AsyncStorage.getItem(`meals_${date}`);
            const meals = storedMeals ? JSON.parse(storedMeals) : [];
            meals.push(newMeal);
            await AsyncStorage.setItem(`meals_${date}`, JSON.stringify(meals));

            setModalVisible(false);
            navigation.navigate('Main');
        } catch (error) {
            console.error('Failed to save meal', error);
            Alert.alert(t('error'), 'Failed to save meal.');
        }
    };

    const closeModal = () => {
        setModalVisible(false);
        setScanned(false);
        setScannedProduct(null);
    };

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

    const pickImage = async () => {
        const canUse = await UsageLimitService.canUseAI(profile.isPremium || false);
        if (!canUse) {
            showLimitAlert();
            return;
        }

        try {
            console.log("Starting pickImage...");
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            console.log("ImagePicker result:", result.canceled ? "Canceled" : "Selected");

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                console.log("Selected Image URI:", uri);
                const analysis = await analyzeImage(uri);
                if (analysis) {
                    await UsageLimitService.incrementUsage();
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                if (analysis) {
                    showAdIfReady(() => {
                        navigation.navigate('MealEntry', {
                            prefilledName: analysis.food_name,
                            prefilledCalories: analysis.calories,
                            prefilledProtein: analysis.protein,
                            prefilledFat: analysis.fat,
                            prefilledCarbs: analysis.carbs,
                            imageUri: uri,
                            date,
                            mealType,
                        });
                    });
                }
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert(t('error'), t('failedToPickImage') || "Failed to pick image.");
        }
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;

        const canUse = await UsageLimitService.canUseAI(profile.isPremium || false);
        if (!canUse) {
            showLimitAlert();
            return;
        }

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: false, // No need for base64 from camera anymore
                quality: 0.8,
            });

            if (photo && photo.uri) {
                // Pass URI to analyzeImage, which now handles resizing and base64 conversion
                const analysis = await analyzeImage(photo.uri);
                if (analysis) {
                    await UsageLimitService.incrementUsage();
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                if (analysis) {
                    showAdIfReady(() => {
                        navigation.navigate('MealEntry', {
                            prefilledName: analysis.food_name,
                            prefilledCalories: analysis.calories,
                            prefilledProtein: analysis.protein,
                            prefilledFat: analysis.fat,
                            prefilledCarbs: analysis.carbs,
                            imageUri: photo.uri,
                            date,
                            mealType,
                        });
                    });
                }
            }
        } catch (error) {
            console.error("Failed to take picture", error);
            Alert.alert(t('error'), t('failedToTakePicture') || "Failed to take picture.");
        }
    };

    return (
        <View style={styles.container}>
            {isFocused && <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                onBarcodeScanned={(scanned || mode === 'ai') ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "upc_e"]
                }}
            >
                <View style={styles.overlay}>
                    <View style={styles.unfocusedContainer}></View>
                    <View style={styles.middleContainer}>
                        <View style={styles.unfocusedContainer}></View>
                        <View style={styles.focusedContainer}>
                            <View style={styles.cornerTopLeft} />
                            <View style={styles.cornerTopRight} />
                            <View style={styles.cornerBottomLeft} />
                            <View style={styles.cornerBottomRight} />
                        </View>
                        <View style={styles.unfocusedContainer}></View>
                    </View>
                    <View style={styles.unfocusedContainer}></View>

                    <View style={styles.controls}>
                        <View style={styles.modeContainer}>
                            <TouchableOpacity
                                style={[styles.modeButton, mode === 'barcode' && styles.modeButtonActive]}
                                onPress={() => setMode('barcode')}
                            >
                                <Text style={[styles.modeText, mode === 'barcode' && styles.modeTextActive]}>バーコード</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeButton, mode === 'ai' && styles.modeButtonActive]}
                                onPress={() => setMode('ai')}
                            >
                                <Text style={[styles.modeText, mode === 'ai' && styles.modeTextActive]}>{t('aiScan') || 'AIスキャン'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeButton]}
                                onPress={() => navigation.navigate('LabelScanner', { date, mealType })}
                            >
                                <Text style={[styles.modeText]}>{t('labelScan') || 'ラベル読み取り'}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.instructionText}>
                            {mode === 'barcode' ? "バーコードをスキャンして食品を追加" : "料理全体が写るように撮影してください"}
                        </Text>

                        {mode === 'ai' && (
                            <View style={styles.aiControlsContainer}>
                                <TouchableOpacity style={styles.galleryButton} onPress={pickImage} disabled={aiLoading}>
                                    <Ionicons name="images" size={30} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={aiLoading}>
                                    <View style={styles.captureButtonInner} />
                                </TouchableOpacity>
                                <View style={{ width: 50 }} />
                            </View>
                        )}

                        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="close-circle" size={50} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>}
            <AILoadingScreen visible={loading || aiLoading} />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        {scannedProduct && (
                            <>
                                <Text style={styles.modalTitle}>{scannedProduct.name}</Text>
                                <View style={styles.nutrientRow}>
                                    <Text style={styles.nutrientText}>Calories: {scannedProduct.calories} kcal</Text>
                                </View>
                                <View style={styles.nutrientRow}>
                                    <Text style={styles.nutrientText}>P: {scannedProduct.protein}g</Text>
                                    <Text style={styles.nutrientText}>F: {scannedProduct.fat}g</Text>
                                    <Text style={styles.nutrientText}>C: {scannedProduct.carbs}g</Text>
                                </View>

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonClose]}
                                        onPress={closeModal}
                                    >
                                        <Text style={styles.textStyle}>{t('cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonAdd]}
                                        onPress={handleAddFood}
                                    >
                                        <Text style={styles.textStyle}>{t('add')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%',
    },
    middleContainer: {
        flexDirection: 'row',
        height: 250,
        width: '100%',
    },
    focusedContainer: {
        width: 250,
        height: 250,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    cornerTopLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 20,
        height: 20,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: 'white',
    },
    cornerTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 20,
        height: 20,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: 'white',
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 20,
        height: 20,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderColor: 'white',
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: 'white',
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
        width: '100%',
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 20,
    },
    closeButton: {
        marginBottom: 20,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold"
    },
    nutrientRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 10,
    },
    nutrientText: {
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        width: '45%',
    },
    buttonClose: {
        backgroundColor: "#FF3B30",
    },
    buttonAdd: {
        backgroundColor: "#34C759",
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    },
    modeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
        marginBottom: 20,
    },
    modeButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 15,
    },
    modeButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    modeText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 'bold',
    },
    modeTextActive: {
        color: 'white',
        fontWeight: "bold",
    },
    aiControlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    galleryButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
});

export default ScannerScreen;
