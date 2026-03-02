import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { analyzeImage } from '../services/aiService';

export default function CameraScreen({ navigation }: any) {
    const { t } = useLanguageContext();
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.permissionContainer}>
                <ScrollView contentContainerStyle={styles.permissionContent}>
                    <Text style={styles.message}>{t('permissionRequired')}</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>続ける</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photoData = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
                setPhoto(photoData?.uri || null);

                if (photoData?.base64) {
                    analyze(photoData.base64);
                }
            } catch (e) {
                console.error(e);
                Alert.alert(t('error'), "Failed to take picture");
            }
        }
    };

    const analyze = async (base64: string) => {
        setAnalyzing(true);
        try {
            const result = await analyzeImage(base64);
            if (result) {
                Alert.alert(
                    "Analysis Complete",
                    `Detected: ${result.name}\n${t('calories')}: ${result.calories}`,
                    [
                        {
                            text: "Cancel",
                            style: "cancel",
                            onPress: () => {
                                setPhoto(null);
                                setAnalyzing(false);
                            }
                        },
                        {
                            text: t('addMeal'),
                            onPress: () => {
                                // Pass data back to MealEntry
                                navigation.navigate('MealEntry', {
                                    prefilledName: result.name,
                                    prefilledCalories: result.calories.toString(),
                                    imageUri: photo // Pass the photo URI
                                });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(t('error'), "Could not identify food.");
                setPhoto(null);
            }
        } catch {
            Alert.alert(t('error'), "AI Analysis failed.");
            setPhoto(null);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <View style={styles.container}>
            {photo ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: photo }} style={styles.preview} />
                    {analyzing && (
                        <View style={styles.overlay}>
                            <Text style={styles.analyzingText}>{t('analyzing')}</Text>
                        </View>
                    )}
                </View>
            ) : (
                <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                            <Text style={styles.text}>Flip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.captureButton]} onPress={takePicture}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>
                        <View style={styles.spacer} />
                    </View>
                </CameraView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    permissionContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 20,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 30,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    button: {
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        marginBottom: 20,
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
    },
    spacer: {
        width: 40,
    },
    previewContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    preview: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    }
});
