import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, Button, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// Using a custom Picker component or basic buttons to avoid extra dependency if possible, 
// but @react-native-picker/picker is standard in Expo. I should have installed it. 
// I'll check my installation list. I didn't install it. 
// I'll use a simple dropdown approach with buttons or TextInput for now to avoid specific picker dependency issues unless I install it.
// Wait, I can install it quickly. It's better UX.
// I'll use standard Buttons for gender and activity level for simplicity and better UI than a native picker often.

const SettingsScreen = ({ navigation }: any) => {
    const { language, setLanguage, t } = useLanguageContext();
    const { profile } = useUser();
    const { logout } = useAuth();
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [activityLevel, setActivityLevel] = useState('1.2');
    const [goal, setGoal] = useState<number | null>(null);

    // Update navigation title based on language
    useEffect(() => {
        navigation.setOptions({ title: t('settings') });
    }, [navigation, language, t]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await AsyncStorage.getItem('userSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setWeight(parsed.weight || '');
                setHeight(parsed.height || '');
                setAge(parsed.age || '');
                setTargetWeight(parsed.targetWeight || '');
                setGender(parsed.gender || 'male');
                setActivityLevel(parsed.activityLevel || '1.2');
                setGoal(parsed.goal || null);
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const calculateGoal = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);
        const act = parseFloat(activityLevel);

        if (isNaN(w) || isNaN(h) || isNaN(a)) {
            Alert.alert(t('error'), t('invalidInput'));
            return;
        }

        let bmr = 0;
        if (gender === 'male') {
            bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a);
        } else {
            bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * a);
        }

        const calculatedGoal = Math.round(bmr * act);
        setGoal(calculatedGoal);
        saveSettings(calculatedGoal, { weight, height, age, gender, activityLevel, targetWeight });
        return calculatedGoal;
    };

    const saveSettings = async (calculatedGoal: number, settings: any) => {
        try {
            // Save current settings
            await AsyncStorage.setItem('userSettings', JSON.stringify({ ...settings, goal: calculatedGoal }));

            // Save Weight History
            if (settings.weight) {
                const today = new Date().toISOString().split('T')[0];
                const weightHistoryJson = await AsyncStorage.getItem('weight_history');
                let weightHistory = weightHistoryJson ? JSON.parse(weightHistoryJson) : [];

                // Remove existing entry for today if any, to prevent duplicates for same day
                weightHistory = weightHistory.filter((item: any) => item.date !== today);

                // Add new entry
                weightHistory.push({ date: today, weight: parseFloat(settings.weight) });

                // Sort by date just in case
                weightHistory.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                await AsyncStorage.setItem('weight_history', JSON.stringify(weightHistory));
            }

            Alert.alert(t('success'), t('goalUpdated', { goal: calculatedGoal }), [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch {
            Alert.alert(t('error'), t('saveFailed'));
        }
    };

    const resetData = async () => {
        Alert.alert(
            t('resetData'),
            t('resetConfirm'),
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await AsyncStorage.clear();
                            Alert.alert(t('success'), t('resetComplete'));
                            // Optional: Restart app or navigate to initial state
                            // For now, reloading settings which will be empty
                            setWeight('');
                            setHeight('');
                            setAge('');
                            setTargetWeight('');
                            setGoal(null);
                        } catch {
                            Alert.alert(t('error'), "Failed to reset data");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('userSettings')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Rank Badge */}
                <View style={styles.rankContainer}>
                    <Ionicons name="medal" size={40} color={profile.streakCount && profile.streakCount >= 30 ? '#FFD700' : profile.streakCount && profile.streakCount >= 7 ? '#C0C0C0' : '#CD7F32'} />
                    <View style={styles.rankInfo}>
                        <Text style={styles.rankLabel}>現在のランク</Text>
                        <Text style={styles.rankValue}>{profile.rank || '見習い研究員'}</Text>
                        <Text style={styles.streakText}>{profile.streakCount || 0} 日連続継続中</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.premiumButton}
                    onPress={() => navigation.navigate('Premium')}
                >
                    <Text style={styles.premiumButtonText}>プレミアムプランについて</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.label}>{t('language')}</Text>
                <View style={styles.row}>
                    <Button
                        title={language === 'en' ? `${t('english')} (Selected)` : t('english')}
                        onPress={() => setLanguage('en')}
                        color={language === 'en' ? '#007AFF' : '#ccc'}
                    />
                    <Button
                        title={language === 'ja' ? `${t('japanese')} (Selected)` : t('japanese')}
                        onPress={() => setLanguage('ja')}
                        color={language === 'ja' ? '#FF2D55' : '#ccc'}
                    />
                </View>

                <Text style={styles.label}>{t('weight')}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="e.g. 70"
                />

                <Text style={styles.label}>{t('targetWeight')}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="e.g. 60"
                />

                <Text style={styles.label}>{t('height')}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                    placeholder="e.g. 175"
                />

                <Text style={styles.label}>{t('age')}</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                    placeholder="e.g. 30"
                />

                <Text style={styles.label}>{t('gender')}</Text>
                <View style={styles.row}>
                    <Button title={gender === 'male' ? `${t('male')} (Selected)` : t('male')} onPress={() => setGender('male')} color={gender === 'male' ? '#007AFF' : '#ccc'} />
                    <Button title={gender === 'female' ? `${t('female')} (Selected)` : t('female')} onPress={() => setGender('female')} color={gender === 'female' ? '#FF2D55' : '#ccc'} />
                </View>

                <Text style={styles.label}>{t('activityLevel')}</Text>
                <View style={styles.activityContainer}>
                    {[
                        { label: t('sedentary'), value: '1.2' },
                        { label: t('light'), value: '1.375' },
                        { label: t('moderate'), value: '1.55' },
                        { label: t('active'), value: '1.725' },
                        { label: t('veryActive'), value: '1.9' },
                    ].map((level) => (
                        <View key={level.value} style={styles.activityButton}>
                            <Button
                                title={level.label}
                                onPress={() => setActivityLevel(level.value)}
                                color={activityLevel === level.value ? '#34C759' : '#ccc'}
                            />
                        </View>
                    ))}
                </View>

                <View style={styles.separator} />

                <Button title={t('saveGoal')} onPress={calculateGoal} />

                {goal && (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultText}>{t('dailyGoal', { goal })}</Text>
                    </View>
                )}

                <View style={styles.separator} />
                <Button title={t('resetData')} onPress={resetData} color="red" />
                <View style={styles.separator} />
                <Button title="Logout" onPress={() => logout()} color="#ff0000" />
                <View style={styles.separator} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        marginTop: 10,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    activityContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    activityButton: {
        width: '48%',
        marginBottom: 5,
    },
    separator: {
        height: 20,
    },
    resultContainer: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    resultText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    rankContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    rankInfo: {
        marginLeft: 15,
    },
    rankLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    rankValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E88E5',
    },
    streakText: {
        fontSize: 14,
        color: '#34C759',
        fontWeight: '600',
    },
    premiumButton: {
        backgroundColor: '#1E88E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 15,
        marginBottom: 30,
    },
    premiumButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 10,
    },
});

export default SettingsScreen;
