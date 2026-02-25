
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { calculateGoals } from '../services/calculator';

// width not used

// Design System Constants
const COLORS = {
    background: '#F8FAFC',
    primary: '#1E88E5',
    text: '#0F172A',
    textSecondary: '#64748B',
    white: '#FFFFFF',
    border: '#E2E8F0',
    error: '#EF4444',
};

const OnboardingScreen = ({ navigation }: any) => {
    const { t } = useLanguageContext();
    const [nickname, setNickname] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
    const [birthYear, setBirthYear] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [activityLevel, setActivityLevel] = useState<'1.2' | '1.375' | '1.55' | '1.725'>('1.2');

    const calculateAge = (year: string, month: string, day: string) => {
        const y = parseInt(year);
        const m = parseInt(month);
        const d = parseInt(day);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return 30; // Default

        const today = new Date();
        const birthDate = new Date(y, m - 1, d);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    const handleFinish = async () => {
        if (!nickname || !gender || !birthYear || !birthMonth || !birthDay || !height || !weight || !targetWeight) {
            Alert.alert(t('error') || 'Error', t('pleaseEnterAllFields') || 'Please enter all fields.');
            return;
        }

        const age = calculateAge(birthYear, birthMonth, birthDay);
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const tw = parseFloat(targetWeight);

        if (isNaN(w) || isNaN(h) || isNaN(tw)) {
            Alert.alert(t('error') || 'Error', t('invalidInput') || 'Invalid input.');
            return;
        }

        const profile = {
            gender: gender === 'other' ? 'male' : gender as any, // fallback for calc
            age,
            heightCm: h,
            weightKg: w,
            activityLevel: activityLevel,
            targetWeightKg: tw,
        };

        const result = calculateGoals(profile);

        const settings = {
            nickname,
            gender,
            birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
            age,
            weight,
            height,
            targetWeight,
            activityLevel,
            goal: result.dailyCalorieGoal,
            pfcGoals: result.pfcGoals,
        };

        try {
            await AsyncStorage.setItem('userSettings', JSON.stringify(settings));

            // Save initial weight to history
            const today = new Date().toISOString().split('T')[0];
            const initialHistory = [{ date: today, weight: w }];
            await AsyncStorage.setItem('weight_history', JSON.stringify(initialHistory));

            await AsyncStorage.setItem('onboardingCompleted', 'true');
            navigation.replace('Main');
        } catch (e) {
            console.error('Failed to save onboarding data', e);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* HeaderSection */}
                    <View style={styles.header}>
                        <LinearGradient
                            colors={['#E3F2FD', '#F8FAFC']}
                            style={styles.headerAccent}
                        />
                        <View style={styles.iconContainer}>
                            <Ionicons name="sparkles" size={30} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>AIと一緒に、{"\n"}理想のカラダへ。</Text>
                        <Text style={styles.subtitle}>まずはあなたのことを教えてください</Text>
                    </View>

                    {/* FormSection */}
                    <View style={styles.form}>
                        {/* Nickname */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('nickname') || 'ニックネーム'}</Text>
                            <TextInput
                                style={styles.input}
                                value={nickname}
                                onChangeText={setNickname}
                                placeholder={t('exampleName') || '例：タナカ'}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        {/* Gender */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('gender') || '性別'}</Text>
                            <View style={styles.choiceRow}>
                                {(['male', 'female', 'other'] as const).map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.choiceButton,
                                            gender === g && styles.choiceButtonSelected
                                        ]}
                                        onPress={() => setGender(g)}
                                    >
                                        <Text style={[
                                            styles.choiceText,
                                            gender === g && styles.choiceTextSelected
                                        ]}>
                                            {t(g as any) || (g === 'male' ? '男性' : g === 'female' ? '女性' : 'その他')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* DOB */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('birthDate') || '生年月日'}</Text>
                            <View style={styles.dateRow}>
                                <TextInput
                                    style={[styles.input, styles.dateInput]}
                                    value={birthYear}
                                    onChangeText={setBirthYear}
                                    placeholder="2000"
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                                <Text style={styles.dateSeparator}>{t('year') || '年'}</Text>
                                <TextInput
                                    style={[styles.input, styles.dateInputSmall]}
                                    value={birthMonth}
                                    onChangeText={setBirthMonth}
                                    placeholder="01"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                <Text style={styles.dateSeparator}>{t('month') || '月'}</Text>
                                <TextInput
                                    style={[styles.input, styles.dateInputSmall]}
                                    value={birthDay}
                                    onChangeText={setBirthDay}
                                    placeholder="01"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                <Text style={styles.dateSeparator}>{t('dayLabel') || '日'}</Text>
                            </View>
                        </View>

                        {/* Height & Weight */}
                        <View style={styles.rowGroup}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.label}>{t('height') || '身長 (cm)'}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={height}
                                    onChangeText={setHeight}
                                    placeholder="170"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>{t('weight') || '現在の体重 (kg)'}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={weight}
                                    onChangeText={setWeight}
                                    placeholder="65.0"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Target Weight */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('targetWeight') || '目標の体重 (kg)'}</Text>
                            <TextInput
                                style={styles.input}
                                value={targetWeight}
                                onChangeText={setTargetWeight}
                                placeholder="60.0"
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Activity Level */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('activityLevel') || '活動レベル'}</Text>
                            <View style={styles.activityList}>
                                {[
                                    { label: t('sedentary') || '座りっぱなし', sub: t('sedentarySub') || '運動不足、デスクワーク中心', value: '1.2' },
                                    { label: t('light') || 'やや活発', sub: t('lightSub') || '週1-3回の軽い運動', value: '1.375' },
                                    { label: t('moderate') || '活発', sub: t('moderateSub') || '週3-5回の定期的な運動', value: '1.55' },
                                    { label: t('active') || '非常に活発', sub: t('activeSub') || '激しい運動を毎日、肉体労働', value: '1.725' },
                                ].map((level) => (
                                    <TouchableOpacity
                                        key={level.value}
                                        style={[
                                            styles.activityCard,
                                            activityLevel === level.value && styles.activityCardSelected
                                        ]}
                                        onPress={() => setActivityLevel(level.value as any)}
                                    >
                                        <View style={styles.activityInfo}>
                                            <Text style={[
                                                styles.activityLabel,
                                                activityLevel === level.value && styles.activityLabelSelected
                                            ]}>{level.label}</Text>
                                            <Text style={styles.activitySub}>{level.sub}</Text>
                                        </View>
                                        {activityLevel === level.value && (
                                            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleFinish}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitButtonText}>{t('calculateGoal') || '次へ（目標カロリーを計算する）'}</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    headerAccent: {
        position: 'absolute',
        top: -100,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.5,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text,
        lineHeight: 40,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    form: {
        paddingHorizontal: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    rowGroup: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: COLORS.text,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    choiceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    choiceButton: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    choiceButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#E3F2FD',
    },
    choiceText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    choiceTextSelected: {
        color: COLORS.primary,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateInput: {
        flex: 2,
    },
    dateInputSmall: {
        flex: 1,
    },
    dateSeparator: {
        marginHorizontal: 6,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    activityList: {
        gap: 12,
    },
    activityCard: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    activityCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#F0F9FF',
    },
    activityInfo: {
        flex: 1,
    },
    activityLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    activityLabelSelected: {
        color: COLORS.primary,
    },
    activitySub: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '800',
    },
});

export default OnboardingScreen;
