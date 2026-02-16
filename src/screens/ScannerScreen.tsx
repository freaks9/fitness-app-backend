import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
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
import { useMealAnalysis } from '../hooks/useMealAnalysis';
import { logMeal, scanFood } from '../services/foodApiService';

const ScannerScreen = ({ navigation, route }: any) => {
    const { t } = useLanguageContext();
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [scannedProduct, setScannedProduct] = useState<any | null>(null);
    const [facing] = useState<CameraType>('back');
    const [mode, setMode] = useState<'barcode' | 'ai'>('barcode');

    const cameraRef = useRef<CameraView>(null);
    const { analyzeImage, loading: aiLoading } = useMealAnalysis();

    const { date, mealType } = route.params || {};

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
            const result = await scanFood(data);
            if (result && result.product) {
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
                    setScannedProduct(result.product);
                    setModalVisible(true);
                }
            } else {
                throw new Error("Product not found");
            }
        } catch {
            Alert.alert(
                t('error'),
                "Product not found.",
                [{ text: 'OK', onPress: () => setScanned(false) }]
            );
        }
        setLoading(false);
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
            navigation.navigate('Dashboard');
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

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.5,
                });

                if (photo && photo.base64) {
                    const analysis = await analyzeImage(photo.base64);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    if (analysis) {
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
                    }
                }
            } catch (error) {
                console.error("Failed to take picture", error);
                Alert.alert(t('error'), "Failed to take picture.");
            }
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
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
                                <Text style={[styles.modeText, mode === 'barcode' && styles.modeTextActive]}>Barcode</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeButton, mode === 'ai' && styles.modeButtonActive]}
                                onPress={() => setMode('ai')}
                            >
                                <Text style={[styles.modeText, mode === 'ai' && styles.modeTextActive]}>{t('aiScan')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeButton]}
                                onPress={() => navigation.navigate('LabelScanner', { date, mealType })}
                            >
                                <Text style={[styles.modeText]}>{t('labelScan')}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.instructionText}>
                            {mode === 'barcode' ? "Scan barcode to add food" : "Take a photo of your meal"}
                        </Text>

                        {mode === 'ai' && (
                            <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={aiLoading}>
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>
                        )}
                        {mode === 'barcode' && (
                            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                                <Ionicons name="close-circle" size={50} color="white" />
                            </TouchableOpacity>
                        )}
                        {mode === 'ai' && (
                            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                                <Text style={{ color: 'white', marginTop: 20 }}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </CameraView>
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
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
});

export default ScannerScreen;
