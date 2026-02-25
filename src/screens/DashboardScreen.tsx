import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommitmentModal } from '../components/CommitmentModal';
import { CountUpText } from '../components/CountUpText';
import { SyncLoadingOverlay } from '../components/SyncLoadingOverlay';
import { CONFIG } from '../constants/Config';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { supabase } from '../lib/supabase';
import { getMealAdvice } from '../services/aiService';
import { getExerciseLogs } from '../services/exerciseService';
import { StreakService } from '../services/StreakService';

const bannerAdUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : CONFIG.AD_UNIT_IDS.BANNER;

// Video Assets - Fallback safely
const COACH_VIDEO_NORMAL = require('../../assets/videos/ai_coach_video.mp4');
// Note: Worried asset is currently missing, fallback to normal if needed in dev
let COACH_VIDEO_WORRIED;
try {
    COACH_VIDEO_WORRIED = require('../../assets/videos/ai_coach_worried.mp4');
} catch (e) {
    COACH_VIDEO_WORRIED = COACH_VIDEO_NORMAL;
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
    dateText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    topGreetingRow: { width: '90%', alignSelf: 'center', marginVertical: 10 },
    greetingText: { fontSize: 22, fontWeight: 'bold', color: '#1E88E5' },
    characterSection: { flexDirection: 'row', alignItems: 'center', marginHorizontal: '5%', marginVertical: 15 },
    videoWrapper: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', borderWidth: 3, borderColor: '#1E88E5' },
    video: { width: '100%', height: '100%' },
    bubble: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 18, marginLeft: 15, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    bubbleText: { fontSize: 15, color: '#333', fontWeight: '500' },
    bubbleArrow: { position: 'absolute', left: -10, top: 25, borderTopWidth: 8, borderTopColor: 'transparent', borderRightWidth: 10, borderRightColor: '#fff', borderBottomWidth: 8, borderBottomColor: 'transparent' },
    calorieCard: { backgroundColor: '#fff', borderRadius: 25, margin: 15, padding: 25, alignItems: 'center', elevation: 2 },
    ringContainer: { marginVertical: 20 },
    remainingValue: { fontSize: 32, fontWeight: '800', color: '#333' },
    remainingLabel: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
    calorieStats: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 20 },
    statItem: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    divider: { width: 1, height: '100%', backgroundColor: '#E5E5EA' },
    timeline: { paddingHorizontal: 15 },
    mealSection: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 1 },
    mealSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    mealSectionTitle: { fontSize: 16, fontWeight: 'bold' },
    mealSectionCalories: { color: '#8E8E93' },
    mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F2F2F7', paddingVertical: 10 },
    mealInfo: { flex: 1 },
    mealName: { fontSize: 16, color: '#333' },
    mealCalories: { fontSize: 14, color: '#8E8E93' },
    deleteButton: { padding: 5, backgroundColor: '#FF3B30', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    deleteButtonText: { color: '#fff', fontWeight: 'bold' },
    addMealButton: { marginTop: 10, padding: 10, alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10 },
    addMealButtonText: { color: '#007AFF', fontWeight: 'bold' },
    fabContainer: { position: 'absolute', bottom: 30, right: 30 },
    fab: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    warningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // [Rule 5] Visible reddish tint when salt is high
        zIndex: 1,
    },
    pfcSmallBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 10,
    },
    pfcSmallText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    pfcSummaryRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    pfcStatItem: {
        alignItems: 'center',
    },
    pfcStatLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    pfcStatValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 10,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderRadius: 15,
        elevation: 2,
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    actionButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#1E88E5',
    },
    completeDayButton: {
        backgroundColor: '#1E88E5',
        margin: 15,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    completeDayButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    dayCompletedBadge: {
        backgroundColor: '#34C759',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 15,
        padding: 12,
        borderRadius: 20,
    },
    dayCompletedText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    weightModalContent: {
        backgroundColor: '#fff',
        width: '80%',
        borderRadius: 25,
        padding: 25,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 20,
    },
    weightInput: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 15,
        padding: 15,
        fontSize: 24,
        textAlign: 'center',
        color: '#1E88E5',
        fontWeight: 'bold',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F1F5F9',
    },
    saveButton: {
        backgroundColor: '#1E88E5',
    },
    cancelButtonText: {
        color: '#64748B',
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    notificationTrigger: {
        padding: 5,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1E88E5',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        width: '100%',
        backgroundColor: '#fff',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
});

const DashboardScreen = ({ navigation }: any) => {
    // const { user } = useAuth(); // Removed unused
    const { t, language } = useLanguageContext();
    const { profile, todaysMeals, loadTodaysMeals, deleteMeal: deleteMealContext, updateProfile } = useUser();
    const insets = useSafeAreaInsets();

    // const [pfcGoals, setPfcGoals] = useState({ protein: 100, fat: 60, carbs: 250 }); // Removed unused
    const [eatenPfc, setEatenPfc] = useState({ protein: 0, fat: 0, carbs: 0 });
    const [totalSalt, setTotalSalt] = useState(0);
    const [goal, setGoal] = useState(2000);
    const [eaten, setEaten] = useState(0);
    const [currentWeight, setCurrentWeight] = useState<number | null>(null);
    const [weightHistory, setWeightHistory] = useState<{ date: string, weight: number }[]>([]);
    // const [todaysExercises, setTodaysExercises] = useState<ExerciseLog[]>([]); // Removed unused
    const [totalExerciseBurn, setTotalExerciseBurn] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [adviceModalVisible, setAdviceModalVisible] = useState(false);
    const [adviceList, setAdviceList] = useState<string[]>([]);
    const [fetchingAdvice, setFetchingAdvice] = useState(false);
    const [dayCompleted, setDayCompleted] = useState(false);
    // const [completionModalVisible, setCompletionModalVisible] = useState(false); // Removed unused
    const [coachingMessage, setCoachingMessage] = useState('');
    const [weightModalVisible, setWeightModalVisible] = useState(false);
    const [weightInput, setWeightInput] = useState('');
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Streak & Commitment States
    const [streakMilestoneVisible, setStreakMilestoneVisible] = useState(false);
    const [currentStreak, setCurrentStreak] = useState(0);
    const { showRewardedAd } = useRewardedAd();

    const nickname = profile.nickname || t('guestResearcher');

    // Header Options
    useEffect(() => {
        navigation.setOptions({
            headerShown: false, // Tabs usually handle headers or we custom render them
        });
    }, [navigation]);

    const loadData = useCallback(async (dateOverride?: string) => {
        const dateStr = dateOverride || selectedDate.toISOString().split('T')[0];
        if (isLoading) return;
        setIsLoading(true);
        try {
            await loadTodaysMeals(dateStr);

            // Fetch unread notifications
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { count } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .eq('is_read', false);
                setUnreadNotifications(count || 0);
            }

            // Settings/Goals sync from profile
            if (profile.goal) setGoal(profile.goal);
            if (profile.weightKg) setCurrentWeight(profile.weightKg);

            // Exercises
            const exercises = await getExerciseLogs(dateStr);
            setTotalExerciseBurn(exercises.reduce((sum, ex: any) => sum + ex.caloriesBurned, 0));

            // Weight History
            const historyJson = await AsyncStorage.getItem('weight_history');
            if (historyJson) setWeightHistory(JSON.parse(historyJson));

            // Day status
            const status = await AsyncStorage.getItem(`day_complete_${dateStr}`);
            setDayCompleted(status === 'true');

        } catch (e) {
            console.error('Failed to load dashboard data', e);
        } finally {
            // Artificial delay for premium feel
            setTimeout(() => setIsLoading(false), 800);
        }
    }, [selectedDate, profile, loadTodaysMeals]);

    const isFocused = useIsFocused();
    useEffect(() => {
        const handleStreak = async () => {
            const result = await StreakService.checkStreak();
            setCurrentStreak(result.currentStreak);

            if (result.isMilestone) {
                setStreakMilestoneVisible(true);
            } else if (result.wasBroken) {
                Alert.alert(
                    '継続が途切れました',
                    `${result.currentStreak}日間の継続が途切れてしまいました。動画広告を見て復元しますか？`,
                    [
                        {
                            text: 'リセットする',
                            style: 'cancel',
                            onPress: async () => {
                                const newCount = await StreakService.resetStreak();
                                setCurrentStreak(newCount);
                                await updateProfile({ streakCount: newCount });
                            }
                        },
                        {
                            text: '動画を見て復元',
                            onPress: () => {
                                showRewardedAd(async () => {
                                    const newCount = await StreakService.recoverStreak();
                                    setCurrentStreak(newCount);
                                    await updateProfile({ streakCount: newCount });
                                    Alert.alert('復活完了！', '継続日数が復元されました。');
                                });
                            }
                        }
                    ]
                );
            } else {
                await updateProfile({ streakCount: result.currentStreak });
            }
        };

        if (isFocused) {
            loadData();
            handleStreak();
        }
    }, [isFocused, loadData]);

    useEffect(() => {
        const interval = setInterval(() => {
            loadData();
        }, 120000); // 2 minutes auto-refresh
        return () => clearInterval(interval);
    }, [loadData]);

    // Sync calculated totals whenever meals change
    useEffect(() => {
        const totalCal = todaysMeals.reduce((sum, m) => sum + (parseInt(m.calories) || 0), 0);
        setEaten(totalCal);

        const totalP = todaysMeals.reduce((sum, m) => sum + (parseFloat(m.protein) || 0), 0);
        const totalF = todaysMeals.reduce((sum, m) => sum + (parseFloat(m.fat) || 0), 0);
        const totalC = todaysMeals.reduce((sum, m) => sum + (parseFloat(m.carbs) || 0), 0);
        setEatenPfc({ protein: Math.round(totalP), fat: Math.round(totalF), carbs: Math.round(totalC) });

        const saltSum = todaysMeals.reduce((sum, m) => sum + (parseFloat(m.salt) || 0), 0);
        setTotalSalt(saltSum);
    }, [todaysMeals]);

    // [Rule 5 Fix] Salt threshold must be 2.5g per Golden Rules
    const isHighSalt = totalSalt > 2.5;

    // Random Coaching Message or Notification Alert
    useEffect(() => {
        if (unreadNotifications > 0) {
            setCoachingMessage(`${nickname}さん、あなたの研究報告に興味深い考察が届いていますよ。ラボで確認してみましょう！`);
            return;
        }

        const messages = language === 'ja' ? [
            `${nickname}さん、今日の調子はいかがですか？`,
            `${nickname}さん、目標まであと一息です。一緒に頑張りましょう！`,
            `今日はどんな食事をしましたか、${nickname}さん？`,
            `${nickname}さん、水分補給もしっかり行いましょうね。`,
            `体調に合わせて無理なく進めましょう、${nickname}さん！`
        ] : [
            `How are you doing today, ${nickname}?`,
            `Almost at your goal, ${nickname}. Let's do this!`,
            `What did you eat today, ${nickname}?`,
            `Stay hydrated, ${nickname}!`,
            `Take it at your own pace, ${nickname}!`
        ];
        setCoachingMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, [nickname, selectedDate, language, unreadNotifications]);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const handleDeleteMeal = (mealIndexInType: number, mealType: string) => {
        const sectionMeals = todaysMeals.filter(m => m.mealType === mealType);
        const mealToDelete = sectionMeals[mealIndexInType];
        if (mealToDelete) {
            Alert.alert(t('deleteMeal'), t('confirmDelete'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('delete'), style: 'destructive', onPress: () => deleteMealContext(mealToDelete.id, mealToDelete.date) }
            ]);
        }
    };

    const handleSaveWeight = async () => {
        const weight = parseFloat(weightInput);
        if (isNaN(weight) || weight <= 0) {
            Alert.alert(t('error'), '正しい体重を入力してください。');
            return;
        }

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const newEntry = { date: dateStr, weight };
            const updatedHistory = [newEntry, ...weightHistory.filter(h => h.date !== dateStr)];

            await AsyncStorage.setItem('weight_history', JSON.stringify(updatedHistory));
            setWeightHistory(updatedHistory);
            setCurrentWeight(weight);
            setWeightModalVisible(false);

            // Update profile as well
            if (dateStr === new Date().toISOString().split('T')[0]) {
                // If it's today, update the current profile weight
                // In a real app, you might want to call profile.updateWeight
            }

            Alert.alert(t('success'), '体重を記録しました。');
        } catch (e) {
            console.error('Failed to save weight', e);
        }
    };

    const handleGetAdvice = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            Alert.alert(t('error'), 'アドバイスを取得するにはサインインが必要です');
            return;
        }

        setFetchingAdvice(true);
        setAdviceModalVisible(true);
        setAdviceList([]);

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const advice = await getMealAdvice(session.user.id, dateStr);
            setAdviceList(advice);

            if (advice.length > 0) {
                setCoachingMessage(advice[0]);
            }
        } catch (error: any) {
            console.error('Failed to get AI advice:', error);
            setAdviceList(["サーバーとの通信に失敗しました。ネットワーク接続を確認してください。"]);
        } finally {
            setFetchingAdvice(false);
        }
    };

    const toggleDayComplete = async () => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const newStatus = !dayCompleted;
        try {
            await AsyncStorage.setItem(`day_complete_${dateStr}`, String(newStatus));
            setDayCompleted(newStatus);
            if (newStatus) {
                Alert.alert('お疲れ様でした！', '今日の記録を完了しました。明日も頑張りましょう！');
            }
        } catch (e) {
            console.error('Failed to save day status', e);
        }
    };

    const remaining = Math.max(0, (goal + totalExerciseBurn) - eaten);

    const renderMealSection = (type: string, title: string) => {
        const sectionMeals = todaysMeals.filter(m => m.mealType === type);
        return (
            <View style={styles.mealSection}>
                <View style={styles.mealSectionHeader}>
                    <Text style={styles.mealSectionTitle}>{title}</Text>
                    <Text style={styles.mealSectionCalories}>
                        {sectionMeals.reduce((sum, m) => sum + (parseInt(m.calories) || 0), 0)} kcal
                    </Text>
                </View>
                {sectionMeals.map((meal, index) => (
                    <View key={meal.id || index} style={styles.mealRow}>
                        <View style={styles.mealInfo}>
                            <Text style={styles.mealName}>{meal.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                                <View style={styles.pfcSmallBadge}>
                                    <Text style={styles.pfcSmallText}>P:{meal.protein} F:{meal.fat} C:{meal.carbs}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteMeal(index, type)}>
                            <Text style={styles.deleteButtonText}>−</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity
                    style={styles.addMealButton}
                    onPress={() => navigation.navigate('AddMealMenu', {
                        date: selectedDate.toISOString().split('T')[0],
                        mealType: type
                    })}
                >
                    <Text style={styles.addMealButtonText}>+ {t('addMeal') || '食事を追加'}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <SyncLoadingOverlay visible={isLoading} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Custom */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => changeDate(-1)}>
                            <Ionicons name="chevron-back" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <Text style={styles.dateText}>{selectedDate.toLocaleDateString()}</Text>
                        <TouchableOpacity onPress={() => changeDate(1)}>
                            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        style={styles.notificationTrigger}
                    >
                        <Ionicons name="notifications-outline" size={26} color="#475569" />
                        {unreadNotifications > 0 && (
                            <View style={styles.notificationBadge} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Banner Ad - Conditional Render for non-premium users */}
                {!profile.isPremium && (
                    <View style={styles.adContainer}>
                        <BannerAd
                            unitId={bannerAdUnitId}
                            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                            requestOptions={{
                                requestNonPersonalizedAdsOnly: false,
                            }}
                            onAdFailedToLoad={(error: Error) => {
                                console.error('Banner Ad failed to load: ', error);
                            }}
                        />
                    </View>
                )}

                <View style={styles.topGreetingRow}>
                    <Text style={styles.greetingText}>{t('welcomeBack')}, {nickname}{language === 'ja' ? t('san') : ''}</Text>
                </View>

                {/* AI Coach */}
                <View style={styles.characterSection}>
                    <View style={[styles.videoWrapper, isHighSalt && { borderColor: '#EF4444' }]}>
                        <Video
                            source={isHighSalt ? COACH_VIDEO_WORRIED : COACH_VIDEO_NORMAL}
                            style={styles.video}
                            resizeMode={ResizeMode.COVER}
                            isLooping
                            isMuted
                            shouldPlay
                            onError={(error) => {
                                console.log('Video loading error:', error);
                            }}
                        />
                    </View>
                    <View style={styles.bubble}>
                        <Text style={styles.bubbleText}>{coachingMessage}</Text>
                        <View style={styles.bubbleArrow} />
                    </View>
                </View>

                {/* Salt Warning Overlay */}
                {isHighSalt && (
                    <View style={styles.warningOverlay} pointerEvents="none" />
                )}

                {/* Calorie Ring */}
                <View style={styles.calorieCard}>
                    <View style={styles.ringContainer}>
                        <PieChart
                            donut
                            innerRadius={70}
                            radius={90}
                            data={[
                                { value: eaten, color: '#007AFF' },
                                { value: remaining, color: '#E5E5EA' }
                            ]}
                            centerLabelComponent={() => (
                                <View style={{ alignItems: 'center' }}>
                                    <CountUpText value={remaining} style={styles.remainingValue} />
                                    <Text style={styles.remainingLabel}>{t('remaining')}</Text>
                                </View>
                            )}
                        />
                    </View>
                    <View style={styles.calorieStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('goal') || '目標'}</Text>
                            <Text style={styles.statValue}>{goal}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('eaten') || '摂取'}</Text>
                            <Text style={styles.statValue}>{eaten}</Text>
                        </View>
                    </View>

                    <View style={styles.pfcSummaryRow}>
                        <View style={styles.pfcStatItem}>
                            <Text style={[styles.pfcStatLabel, { color: '#FF9500' }]}>P</Text>
                            <Text style={styles.pfcStatValue}>{eatenPfc.protein}g</Text>
                        </View>
                        <View style={styles.pfcStatItem}>
                            <Text style={[styles.pfcStatLabel, { color: '#FF2D55' }]}>F</Text>
                            <Text style={styles.pfcStatValue}>{eatenPfc.fat}g</Text>
                        </View>
                        <View style={styles.pfcStatItem}>
                            <Text style={[styles.pfcStatLabel, { color: '#34C759' }]}>C</Text>
                            <Text style={styles.pfcStatValue}>{eatenPfc.carbs}g</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            setWeightInput(currentWeight ? currentWeight.toString() : '');
                            setWeightModalVisible(true);
                        }}
                    >
                        <Ionicons name="speedometer-outline" size={20} color="#1E88E5" />
                        <Text style={styles.actionButtonText}>体重を記録</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleGetAdvice}
                    >
                        <Ionicons name="bulb-outline" size={20} color="#1E88E5" />
                        <Text style={styles.actionButtonText}>アドバイス</Text>
                    </TouchableOpacity>
                </View>

                {/* Meal Timeline */}
                <View style={styles.timeline}>
                    {renderMealSection('breakfast', t('breakfast'))}
                    {renderMealSection('lunch', t('lunch'))}
                    {renderMealSection('dinner', t('dinner'))}
                    {renderMealSection('snack', t('snack'))}
                </View>

                {/* Day Complete Button */}
                {dayCompleted ? (
                    <View style={styles.dayCompletedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="white" />
                        <Text style={styles.dayCompletedText}>今日の記録は完了しました</Text>
                        <TouchableOpacity onPress={toggleDayComplete} style={{ marginLeft: 10 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>解除</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.completeDayButton} onPress={toggleDayComplete}>
                        <Ionicons name="flag-outline" size={20} color="white" />
                        <Text style={styles.completeDayButtonText}>今日の記録を完了する</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Advice Modal */}
            <Modal
                visible={adviceModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAdviceModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.weightModalContent, { width: '90%', maxHeight: '80%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
                            <Text style={[styles.modalTitle, { marginBottom: 0 }]}>AI研究アドバイス</Text>
                            <TouchableOpacity onPress={() => setAdviceModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {fetchingAdvice ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#1E88E5" />
                                <Text style={{ marginTop: 15, color: '#64748B', fontWeight: '500' }}>データを分析中...</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                                {adviceList.length > 0 ? (
                                    adviceList.map((item, index) => (
                                        <View key={index} style={{
                                            backgroundColor: '#F8FAFC',
                                            padding: 15,
                                            borderRadius: 15,
                                            marginBottom: 10,
                                            borderLeftWidth: 4,
                                            borderLeftColor: '#1E88E5'
                                        }}>
                                            <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20 }}>{item}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>
                                        まだデータがありません。
                                    </Text>
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton, { width: '100%', marginTop: 20 }]}
                            onPress={() => setAdviceModalVisible(false)}
                        >
                            <Text style={styles.saveButtonText}>了解しました</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Weight Modal */}
            <Modal
                visible={weightModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setWeightModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.weightModalContent}>
                        <Text style={styles.modalTitle}>体重を記録</Text>
                        <TextInput
                            style={styles.weightInput}
                            keyboardType="numeric"
                            placeholder="0.0"
                            value={weightInput}
                            onChangeText={setWeightInput}
                            autoFocus={true}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setWeightModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveWeight}
                            >
                                <Text style={styles.saveButtonText}>保存する</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Quick Actions Float */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddMealMenu', {
                        date: selectedDate.toISOString().split('T')[0],
                        mealType: 'breakfast' // Default to breakfast or current time-based type
                    })}
                >
                    <Ionicons name="add" size={35} color="white" />
                </TouchableOpacity>
            </View>

            <CommitmentModal
                visible={streakMilestoneVisible}
                streakCount={currentStreak}
                onCommit={() => setStreakMilestoneVisible(false)}
                onClose={() => setStreakMilestoneVisible(false)}
            />
        </View>
    );
};

export default DashboardScreen;
