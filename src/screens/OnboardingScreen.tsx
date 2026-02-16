import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { calculateGoals } from '../services/calculator';

const OnboardingScreen = ({ navigation }: any) => {
    const { t, setLanguage, language } = useLanguageContext();
    const [step, setStep] = useState(0);

    // Animation State
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        const breathingAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        breathingAnimation.start();

        return () => breathingAnimation.stop();
    }, [scaleAnim]);

    // Form State
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [activityLevel, setActivityLevel] = useState('1.2');
    const [targetWeight, setTargetWeight] = useState('');

    const nextStep = () => {
        if (step === 1) {
            if (!gender || !age || !height || !weight) {
                Alert.alert(t('error'), t('pleaseEnterAllFields'));
                return;
            }
        }
        if (step < 2) {
            setStep(step + 1);
        } else {
            finishOnboarding();
        }
    };

    const finishOnboarding = async () => {
        if (!targetWeight) {
            Alert.alert(t('error'), t('pleaseEnterAllFields'));
            return;
        }

        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);
        const tw = parseFloat(targetWeight);

        // Validate inputs
        if (isNaN(w) || isNaN(h) || isNaN(a) || isNaN(tw)) {
            Alert.alert(t('error'), t('invalidInput'));
            return;
        }

        const profile = {
            gender,
            age: a,
            heightCm: h,
            weightKg: w,
            activityLevel: activityLevel as any,
            targetWeightKg: isNaN(tw) ? undefined : tw,
        };

        const result = calculateGoals(profile);

        const settings = {
            weight,
            height,
            age,
            gender,
            activityLevel,
            targetWeight,
            goal: result.dailyCalorieGoal,
            pfcGoals: result.pfcGoals, // Save PFC goals
        };

        try {
            await AsyncStorage.setItem('userSettings', JSON.stringify(settings));

            // Save initial weight to history
            if (weight) {
                const today = new Date().toISOString().split('T')[0];
                const initialHistory = [{ date: today, weight: parseFloat(weight) }];
                await AsyncStorage.setItem('weight_history', JSON.stringify(initialHistory));
            }

            await AsyncStorage.setItem('onboardingCompleted', 'true');
            navigation.replace('Dashboard');
        } catch (e) {
            console.error('Failed to save onboarding data', e);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 0: // Welcome & Language
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.bubble}>
                            <Text style={styles.bubbleText}>
                                {language === 'en' ? "Hi! I'm your personal fitness assistant. Let's get started!" : "こんにちは！あなたのパーソナルフィットネスアシスタントです。一緒に頑張りましょう！"}
                            </Text>
                        </View>
                        <Animated.Image
                            source={require('../../assets/ai_secretary_fitness_1771204309038.png')}
                            style={[styles.characterImage, { transform: [{ scale: scaleAnim }] }]}
                            resizeMode="contain"
                        />
                        <View style={styles.formContainer}>
                            <Text style={styles.label}>Language / 言語</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.optionButton, language === 'en' && styles.selectedOption]}
                                    onPress={() => setLanguage('en')}
                                >
                                    <Text style={[styles.optionText, language === 'en' && styles.selectedOptionText]}>English</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionButton, language === 'ja' && styles.selectedOption]}
                                    onPress={() => setLanguage('ja')}
                                >
                                    <Text style={[styles.optionText, language === 'ja' && styles.selectedOptionText]}>日本語</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                                <Text style={styles.nextButtonText}>{t('next')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 1: // Basic Info
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.bubble}>
                            <Text style={styles.bubbleText}>
                                {t('tellMeAboutYou')}
                            </Text>
                        </View>
                        <Animated.Image
                            source={require('../../assets/ai_secretary_fitness_1771204309038.png')}
                            style={[styles.characterImageSmall, { transform: [{ scale: scaleAnim }] }]}
                            resizeMode="contain"
                        />
                        <ScrollView style={styles.formContainer}>
                            <Text style={styles.label}>{t('gender')}</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.optionButton, gender === 'male' && styles.selectedOption]}
                                    onPress={() => setGender('male')}
                                >
                                    <Text style={[styles.optionText, gender === 'male' && styles.selectedOptionText]}>{t('male')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionButton, gender === 'female' && styles.selectedOption]}
                                    onPress={() => setGender('female')}
                                >
                                    <Text style={[styles.optionText, gender === 'female' && styles.selectedOptionText]}>{t('female')}</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>{t('age')}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={age}
                                onChangeText={setAge}
                                placeholder="30"
                            />

                            <Text style={styles.label}>{t('height')}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={height}
                                onChangeText={setHeight}
                                placeholder="170"
                            />

                            <Text style={styles.label}>{t('weight')}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={weight}
                                onChangeText={setWeight}
                                placeholder="65"
                            />

                            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                                <Text style={styles.nextButtonText}>{t('next')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                );
            case 2: // Goal
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.bubble}>
                            <Text style={styles.bubbleText}>
                                {t('setYourGoal')}
                            </Text>
                        </View>
                        <Animated.Image
                            source={require('../../assets/ai_secretary_fitness_1771204309038.png')}
                            style={[styles.characterImageSmall, { transform: [{ scale: scaleAnim }] }]}
                            resizeMode="contain"
                        />
                        <ScrollView style={styles.formContainer}>
                            <Text style={styles.label}>{t('activityLevel')}</Text>
                            <View style={styles.activityContainer}>
                                {[
                                    { label: t('sedentary'), value: '1.2' }, // Little or no exercise
                                    { label: t('light'), value: '1.375' },   // Light exercise 1-3 days/week
                                    { label: t('moderate'), value: '1.55' },  // Moderate exercise 3-5 days/week
                                    { label: t('active'), value: '1.725' },   // Hard exercise 6-7 days/week
                                ].map((level) => (
                                    <TouchableOpacity
                                        key={level.value}
                                        style={[styles.activityButton, activityLevel === level.value && styles.selectedOption]}
                                        onPress={() => setActivityLevel(level.value)}
                                    >
                                        <Text style={[styles.activityText, activityLevel === level.value && styles.selectedOptionText]}>
                                            {level.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{t('targetWeight')}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={targetWeight}
                                onChangeText={setTargetWeight}
                                placeholder="60"
                            />

                            <TouchableOpacity style={[styles.nextButton, { backgroundColor: '#34C759' }]} onPress={finishOnboarding}>
                                <Text style={styles.nextButtonText}>{t('startApp')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {renderStep()}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    characterImage: {
        width: 300,
        height: 300,
        marginBottom: 20,
    },
    characterImageSmall: {
        width: 150,
        height: 150,
        marginBottom: 10,
    },
    bubble: {
        backgroundColor: '#f0f8ff',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#007AFF',
        maxWidth: '90%',
    },
    bubbleText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 15,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    optionButton: {
        flex: 1,
        padding: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    selectedOption: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOptionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 15,
        fontSize: 18,
        marginBottom: 10,
    },
    nextButton: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 50,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    activityContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    activityButton: {
        width: '48%',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    activityText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
});

export default OnboardingScreen;
