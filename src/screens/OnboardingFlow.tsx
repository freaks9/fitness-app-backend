
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInRight,
    FadeOutLeft,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useUser } from '../context/UserContext';
import { calculateGoals } from '../services/calculator';

// width/height not used

const COLORS = {
    primary: '#1E88E5',
    background: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#64748B',
    white: '#FFFFFF',
    border: '#E2E8F0',
};

const STEPS = [
    { key: 'nickname', label: 'ニックネーム', question: 'まずはあなたを何とお呼びすればいいですか？', placeholder: '例：タナカ', keyboardType: 'default' },
    { key: 'gender', label: '性別', question: (name: string) => `${name}さん、次に性別を教えてください。`, options: ['男性', '女性', 'その他'] },
    { key: 'age', label: '年齢', question: (name: string) => `${name}さん、現在の年齢を教えてください。`, placeholder: '30', keyboardType: 'numeric' },
    { key: 'height', label: '身長', question: (name: string) => `${name}さん、現在の身長（cm）を教えてください。`, placeholder: '170', keyboardType: 'numeric' },
    { key: 'weight', label: '体重', question: (name: string) => `${name}さん、現在の体重（kg）を教えてください。`, placeholder: '65.0', keyboardType: 'numeric' },
    { key: 'targetWeight', label: '目標体重', question: (name: string) => `理想の体重（kg）はどれくらいですか？`, placeholder: '60.0', keyboardType: 'numeric' },
    {
        key: 'activityLevel', label: '活動レベル', question: (name: string) => `普段の活動量を教えてください。`, options: [
            { label: '低い', sub: '座りっぱなし、デスクワーク中心', value: '1.2' },
            { label: '普通', sub: '立ち仕事や頻繁な移動あり', value: '1.375' },
            { label: '高い', sub: '肉体労働や激しい運動をする', value: '1.725' }
        ]
    },
];

const OnboardingFlow = ({ navigation }: any) => {
    const { updateProfile } = useUser();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        nickname: '',
        gender: '',
        age: '',
        height: '',
        weight: '',
        targetWeight: '',
        activityLevel: '1.2',
    });

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming((currentStep + 1) / STEPS.length, { duration: 500 });
    }, [currentStep, progress]);

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const handleNext = async () => {
        const step = STEPS[currentStep];
        const val = (formData as any)[step.key];

        if (!val && step.key !== 'activityLevel') {
            Alert.alert('入力エラー', '項目を入力してください。');
            return;
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            await finishOnboarding();
        }
    };

    const finishOnboarding = async () => {
        try {
            const profile = {
                nickname: formData.nickname,
                gender: (formData.gender === '女性' ? 'female' : 'male') as 'male' | 'female',
                age: parseInt(formData.age),
                heightCm: parseFloat(formData.height),
                weightKg: parseFloat(formData.weight),
                activityLevel: formData.activityLevel as any,
                targetWeightKg: parseFloat(formData.targetWeight),
            };

            const result = calculateGoals(profile);

            await updateProfile({
                ...profile,
                goal: result.dailyCalorieGoal,
                pfcGoals: result.pfcGoals,
            } as any);

            // Save initial weight history
            const today = new Date().toISOString().split('T')[0];
            const initialHistory = [{ date: today, weight: parseFloat(formData.weight) }];
            await AsyncStorage.setItem('weight_history', JSON.stringify(initialHistory));

            await AsyncStorage.setItem('onboardingCompleted', 'true');
            navigation.replace('Main');
        } catch (e) {
            console.error(e);
            Alert.alert('エラー', 'データの保存に失敗しました。');
        }
    };

    const renderInput = () => {
        const step = STEPS[currentStep];

        if (step.key === 'gender') {
            return (
                <View style={styles.optionContainer}>
                    {step.options?.map((opt: any) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.optionButton, formData.gender === opt && styles.optionButtonActive]}
                            onPress={() => setFormData({ ...formData, gender: opt })}
                        >
                            <Text style={[styles.optionText, formData.gender === opt && styles.optionTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (step.key === 'activityLevel') {
            return (
                <View style={styles.activityContainer}>
                    {(step.options as any[]).map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.activityCard, formData.activityLevel === opt.value && styles.activityCardActive]}
                            onPress={() => setFormData({ ...formData, activityLevel: opt.value })}
                        >
                            <View>
                                <Text style={[styles.activityLabel, formData.activityLevel === opt.value && styles.activityLabelActive]}>{opt.label}</Text>
                                <Text style={styles.activitySub}>{opt.sub}</Text>
                            </View>
                            {formData.activityLevel === opt.value && (
                                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        return (
            <TextInput
                style={styles.input}
                value={(formData as any)[step.key]}
                onChangeText={(text) => setFormData({ ...formData, [step.key]: text })}
                placeholder={step.placeholder}
                placeholderTextColor="#94A3B8"
                keyboardType={step.keyboardType as any}
                autoFocus
            />
        );
    };

    const currentQuestion = typeof STEPS[currentStep].question === 'function'
        ? (STEPS[currentStep].question as any)(formData.nickname)
        : STEPS[currentStep].question;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.content}>
                    {/* Character Section */}
                    <View style={styles.characterSection}>
                        <View style={styles.videoWrapper}>
                            <Video
                                source={require('../../assets/videos/ai_coach_video.mp4')}
                                style={styles.video}
                                resizeMode={ResizeMode.COVER}
                                isLooping
                                isMuted
                                shouldPlay
                            />
                        </View>
                        <View style={styles.bubble}>
                            <Text style={styles.bubbleText}>{currentQuestion}</Text>
                            <View style={styles.bubbleArrow} />
                        </View>
                    </View>

                    {/* Step Content */}
                    <Animated.View
                        key={currentStep}
                        entering={FadeInRight}
                        exiting={FadeOutLeft}
                        layout={Layout.springify()}
                        style={styles.stepContainer}
                    >
                        <Text style={styles.stepLabel}>{STEPS[currentStep].label}</Text>
                        {renderInput()}
                    </Animated.View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {currentStep > 0 && (
                            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(currentStep - 1)}>
                                <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>
                                {currentStep === STEPS.length - 1 ? '完了' : '次へ'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#E2E8F0',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 30,
    },
    characterSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
    },
    videoWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.primary,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    bubble: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        marginLeft: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        position: 'relative',
    },
    bubbleText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
        fontWeight: '600',
    },
    bubbleArrow: {
        position: 'absolute',
        left: -10,
        top: 30,
        width: 0,
        height: 0,
        borderTopWidth: 10,
        borderTopColor: 'transparent',
        borderRightWidth: 10,
        borderRightColor: COLORS.white,
        borderBottomWidth: 10,
        borderBottomColor: 'transparent',
    },
    stepContainer: {
        flex: 1,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingVertical: 12,
    },
    optionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    optionButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#E3F2FD',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    optionTextActive: {
        color: COLORS.primary,
    },
    activityContainer: {
        gap: 12,
    },
    activityCard: {
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    activityCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#F0F9FF',
    },
    activityLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    activityLabelActive: {
        color: COLORS.primary,
    },
    activitySub: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 40,
        gap: 16,
    },
    backButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        flex: 1,
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    nextButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '800',
        marginRight: 8,
    },
});

export default OnboardingFlow;
