import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Alert, DeviceEventEmitter, Image, KeyboardAvoidingView,
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
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { calculateGoals } from '../services/calculator';

const COLORS = {
    primary: '#1E88E5',
    background: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#64748B',
    white: '#FFFFFF',
    border: '#E2E8F0',
};

type StepKey = 'nickname' | 'gender' | 'birthdate' | 'height' | 'weight' | 'targetWeight' | 'activityLevel';

interface Step {
    key: StepKey;
    label: string;
    question: string | ((name: string) => string);
}

const STEPS: Step[] = [
    { key: 'nickname', label: 'ニックネーム', question: 'まずはあなたをどうお呼びすればいいですか？' },
    { key: 'gender', label: '性別', question: (name: string) => `${name}さん、性別を教えてください。` },
    { key: 'birthdate', label: '生年月日', question: (name: string) => `${name}さん、生年月日を教えてください。` },
    { key: 'height', label: '身長', question: (name: string) => `${name}さん、現在の身長（cm）は？` },
    { key: 'weight', label: '現在の体重', question: (name: string) => `${name}さん、現在の体重（kg）は？` },
    { key: 'targetWeight', label: '目標体重', question: (name: string) => `${name}さんの目標体重（kg）は？` },
    { key: 'activityLevel', label: '活動レベル', question: '普段の活動量を教えてください。' },
];

const ACTIVITY_OPTIONS = [
    { label: '低い', sub: '座りっぱなし・デスクワーク中心', value: '1.2' },
    { label: '普通', sub: '立ち仕事や頻繁な移動あり', value: '1.375' },
    { label: '高い', sub: '肉体労働や激しい運動をする', value: '1.725' },
];

const OnboardingScreen = ({ navigation }: any) => {
    const { updateProfile } = useUser();
    const { enterGuestMode } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        nickname: '',
        gender: '' as 'male' | 'female' | 'other' | '',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        height: '',
        weight: '',
        targetWeight: '',
        activityLevel: '1.2',
    });

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming((currentStep + 1) / STEPS.length, { duration: 400 });
    }, [currentStep]);

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const currentQuestion = typeof STEPS[currentStep].question === 'function'
        ? (STEPS[currentStep].question as (n: string) => string)(formData.nickname || 'あなた')
        : STEPS[currentStep].question;

    const validateCurrentStep = (): boolean => {
        const key = STEPS[currentStep].key;
        switch (key) {
            case 'nickname': return formData.nickname.trim().length > 0;
            case 'gender': return formData.gender !== '';
            case 'birthdate': return formData.birthYear.length === 4 && formData.birthMonth.length > 0 && formData.birthDay.length > 0;
            case 'height': return parseFloat(formData.height) > 0;
            case 'weight': return parseFloat(formData.weight) > 0;
            case 'targetWeight': return parseFloat(formData.targetWeight) > 0;
            case 'activityLevel': return true;
            default: return true;
        }
    };

    const handleNext = async () => {
        if (!validateCurrentStep()) {
            Alert.alert('入力エラー', '項目を入力してください。');
            return;
        }
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            await finishOnboarding();
        }
    };

    const finishOnboarding = async () => {
        try {
            const y = parseInt(formData.birthYear);
            const m = parseInt(formData.birthMonth);
            const d = parseInt(formData.birthDay);
            const today = new Date();
            const birthDate = new Date(y, m - 1, d);
            let age = today.getFullYear() - birthDate.getFullYear();
            if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age--;
            age = Math.max(1, age);

            const profile = {
                nickname: formData.nickname,
                gender: (formData.gender === 'other' ? 'male' : formData.gender) as 'male' | 'female',
                age,
                heightCm: parseFloat(formData.height),
                weightKg: parseFloat(formData.weight),
                targetWeightKg: parseFloat(formData.targetWeight),
                activityLevel: formData.activityLevel as any,
            };

            const result = calculateGoals(profile);

            await updateProfile({
                ...profile,
                goal: result.dailyCalorieGoal,
                pfcGoals: result.pfcGoals,
            } as any);

            const todayStr = new Date().toISOString().split('T')[0];
            await AsyncStorage.setItem('weight_history', JSON.stringify([{ date: todayStr, weight: parseFloat(formData.weight) }]));
            await AsyncStorage.setItem('onboardingCompleted', 'true');
            DeviceEventEmitter.emit('onboardingComplete');
            await enterGuestMode();
        } catch (e) {
            console.error(e);
            Alert.alert('エラー', 'データの保存に失敗しました。');
        }
    };

    const renderStepContent = () => {
        const key = STEPS[currentStep].key;

        if (key === 'nickname') {
            return (
                <TextInput
                    style={styles.bigInput}
                    value={formData.nickname}
                    onChangeText={(v) => setFormData(f => ({ ...f, nickname: v }))}
                    placeholder="例：タナカ"
                    placeholderTextColor="#94A3B8"
                    autoFocus
                    maxLength={20}
                />
            );
        }

        if (key === 'gender') {
            const options = [
                { label: '男性', value: 'male' },
                { label: '女性', value: 'female' },
                { label: 'その他', value: 'other' },
            ];
            return (
                <View style={styles.optionContainer}>
                    {options.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.optionButton, formData.gender === opt.value && styles.optionButtonActive]}
                            onPress={() => setFormData(f => ({ ...f, gender: opt.value as any }))}
                        >
                            <Text style={[styles.optionText, formData.gender === opt.value && styles.optionTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (key === 'birthdate') {
            return (
                <View style={styles.dateRow}>
                    <TextInput
                        style={[styles.bigInput, styles.dateInputYear]}
                        value={formData.birthYear}
                        onChangeText={(v) => setFormData(f => ({ ...f, birthYear: v }))}
                        placeholder="1995"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={4}
                        autoFocus
                    />
                    <Text style={styles.dateSep}>年</Text>
                    <TextInput
                        style={[styles.bigInput, styles.dateInputSmall]}
                        value={formData.birthMonth}
                        onChangeText={(v) => setFormData(f => ({ ...f, birthMonth: v }))}
                        placeholder="01"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={2}
                    />
                    <Text style={styles.dateSep}>月</Text>
                    <TextInput
                        style={[styles.bigInput, styles.dateInputSmall]}
                        value={formData.birthDay}
                        onChangeText={(v) => setFormData(f => ({ ...f, birthDay: v }))}
                        placeholder="01"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={2}
                    />
                    <Text style={styles.dateSep}>日</Text>
                </View>
            );
        }

        if (key === 'activityLevel') {
            return (
                <View style={styles.activityContainer}>
                    {ACTIVITY_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.activityCard, formData.activityLevel === opt.value && styles.activityCardActive]}
                            onPress={() => setFormData(f => ({ ...f, activityLevel: opt.value }))}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.activityLabel, formData.activityLevel === opt.value && { color: COLORS.primary }]}>
                                    {opt.label}
                                </Text>
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

        // numeric inputs: height, weight, targetWeight
        const placeholders: Record<string, string> = {
            height: '170',
            weight: '65.0',
            targetWeight: '60.0',
        };
        const units: Record<string, string> = {
            height: 'cm',
            weight: 'kg',
            targetWeight: 'kg',
        };

        return (
            <View style={styles.numericRow}>
                <TextInput
                    style={[styles.bigInput, { flex: 1 }]}
                    value={(formData as any)[key]}
                    onChangeText={(v) => setFormData(f => ({ ...f, [key]: v }))}
                    placeholder={placeholders[key]}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    autoFocus
                />
                <Text style={styles.unitLabel}>{units[key]}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Progress */}
            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
            </View>
            <Text style={styles.stepCounter}>{currentStep + 1} / {STEPS.length}</Text>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.content}>
                    {/* AI Character */}
                    <View style={styles.characterSection}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={require('../../assets/ai_coach_welcome.png')}
                                style={styles.avatar}
                                resizeMode="cover"
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
                        entering={FadeInRight.duration(300)}
                        exiting={FadeOutLeft.duration(200)}
                        style={styles.stepContent}
                    >
                        <Text style={styles.stepLabel}>{STEPS[currentStep].label}</Text>
                        {renderStepContent()}
                    </Animated.View>

                    {/* Footer Nav */}
                    <View style={styles.footer}>
                        {currentStep > 0 ? (
                            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(s => s - 1)}>
                                <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        ) : <View style={{ width: 56 }} />}
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>
                                {currentStep === STEPS.length - 1 ? 'はじめる' : '次へ'}
                            </Text>
                            <Ionicons name={currentStep === STEPS.length - 1 ? 'rocket' : 'chevron-forward'} size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    progressTrack: { height: 5, backgroundColor: '#E2E8F0', width: '100%' },
    progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    stepCounter: { textAlign: 'right', paddingHorizontal: 20, paddingTop: 8, fontSize: 13, color: '#94A3B8', fontWeight: '600' },

    content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },

    // AI Character
    characterSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
    avatarWrapper: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.primary },
    avatar: { width: '100%', height: '100%' },
    bubble: {
        flex: 1, backgroundColor: COLORS.white, padding: 16,
        borderRadius: 16, marginLeft: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, position: 'relative',
    },
    bubbleText: { fontSize: 15, color: COLORS.text, lineHeight: 22, fontWeight: '600' },
    bubbleArrow: {
        position: 'absolute', left: -10, top: 24,
        width: 0, height: 0,
        borderTopWidth: 10, borderTopColor: 'transparent',
        borderRightWidth: 10, borderRightColor: COLORS.white,
        borderBottomWidth: 10, borderBottomColor: 'transparent',
    },

    // Step Content
    stepContent: { flex: 1 },
    stepLabel: {
        fontSize: 12, fontWeight: '700', color: COLORS.primary,
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16,
    },

    // Input
    bigInput: {
        fontSize: 28, fontWeight: '700', color: COLORS.text,
        borderBottomWidth: 2.5, borderBottomColor: COLORS.primary,
        paddingVertical: 10, backgroundColor: 'transparent',
    },
    numericRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    unitLabel: { fontSize: 20, fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 10 },

    // Birthdate
    dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    dateInputYear: { width: 90 },
    dateInputSmall: { width: 56 },
    dateSep: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 10, marginHorizontal: 2 },

    // Gender Options
    optionContainer: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    optionButton: {
        paddingVertical: 18, paddingHorizontal: 28,
        borderRadius: 14, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: COLORS.white,
    },
    optionButtonActive: { borderColor: COLORS.primary, backgroundColor: '#E3F2FD' },
    optionText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
    optionTextActive: { color: COLORS.primary },

    // Activity
    activityContainer: { gap: 12 },
    activityCard: {
        backgroundColor: COLORS.white, borderWidth: 1.5,
        borderColor: COLORS.border, borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    activityCardActive: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF' },
    activityLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
    activitySub: { fontSize: 12, color: COLORS.textSecondary },

    // Footer Nav
    footer: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingBottom: 36, gap: 12,
    },
    backButton: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    },
    nextButton: {
        flex: 1, height: 56, backgroundColor: COLORS.primary,
        borderRadius: 28, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    nextButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginRight: 8 },
});

export default OnboardingScreen;
