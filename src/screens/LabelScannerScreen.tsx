import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AILoadingScreen } from '../components/AILoadingScreen';
import { useLanguageContext } from '../context/LanguageContext';
import { useMealAnalysis } from '../hooks/useMealAnalysis';

const LabelScannerScreen = ({ navigation }: any) => {
    const isFocused = useIsFocused();
    const { t } = useLanguageContext();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);
    const { analyzeLabelImage, loading } = useMealAnalysis();
    const [isScanning, setIsScanning] = useState(false);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>{t('permissionRequired')}</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>{t('ok')}</Text>
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
                    // Pass URI to analyzeLabelImage
                    const analysis = await analyzeLabelImage(photo.uri);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    if (analysis) {
                        navigation.navigate('MealEntry', {
                            prefilledName: analysis.food_name || '',
                            prefilledCalories: analysis.calories || '',
                            prefilledProtein: analysis.protein || '',
                            prefilledFat: analysis.fat || '',
                            prefilledCarbs: analysis.carbs || '',
                            imageUri: photo.uri,
                            scannedBarcode: (navigation.getState().routes.find((r: any) => r.name === 'LabelScanner')?.params as any)?.scannedBarcode
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
