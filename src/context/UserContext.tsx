import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as IAP from 'react-native-iap';
import { supabase } from '../lib/supabase';
import * as foodApi from '../services/foodApiService';
import { StreakService } from '../services/StreakService';
import { SavedMenu } from '../types/savedMenu';

interface UserProfile {
    nickname: string;
    gender?: 'male' | 'female';
    age?: number;
    heightCm?: number;
    weightKg?: number;
    targetWeightKg?: number;
    activityLevel?: string;
    goal?: number;
    pfcGoals?: {
        protein: number;
        fat: number;
        carbs: number;
    };
    aiCoachSettings?: {
        tone: 'professional' | 'friendly' | 'strict';
        warningSensitivity: number; // 0-100
    };
    isPremium?: boolean;
    streakCount?: number;
    rank?: string;
}

export interface LabPost {
    id: string;
    userId?: string;
    mealName: string;
    userName: string;
    date: string;
    pfc: {
        protein: number;
        fat: number;
        carbs: number;
    };
    calories: number;
    tags: string[];
    memo: string;
    imageUrl?: string;
    methodTag?: string;
    isRecommended?: boolean;
    isMock?: boolean;
    nutrientsDetail: {
        label: string;
        value: number;
        unit: string;
        goal?: number;
    }[];
    likesCount?: number;
    commentsCount?: number;
}

export interface LabStats {
    usefulCount: number;
    replicateCount: number;
    totalPoints: number;
    rank: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

interface UserContextType {
    profile: UserProfile;
    todaysMeals: any[];
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    loadProfile: () => Promise<void>;
    addMeal: (meal: any) => Promise<void>;
    deleteMeal: (mealId: string | number, date?: string) => Promise<void>;
    loadTodaysMeals: (date?: string) => Promise<void>;
    mealHistory: any[];
    labPosts: LabPost[];
    labStats: LabStats;
    savedMenus: SavedMenu[];
    saveMenu: (reportId: string) => Promise<void>;
    unsaveMenu: (reportId: string) => Promise<void>;
    loadSavedMenus: () => Promise<void>;
    loadLabStats: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile>({
        nickname: 'ゲスト',
        aiCoachSettings: {
            tone: 'professional',
            warningSensitivity: 70
        }
    });
    const [todaysMeals, setTodaysMeals] = useState<any[]>([]);
    const [mealHistory, setMealHistory] = useState<any[]>([]);
    const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
    const [labStats, setLabStats] = useState<LabStats>({
        usefulCount: 0,
        replicateCount: 0,
        totalPoints: 0,
        rank: 'STANDARD'
    });
    // This is a static mock list for now
    const [labPosts] = useState<LabPost[]>([
        {
            id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
            userId: '00000000-0000-0000-0000-000000000000',
            isMock: true,
            mealName: '鶏胸肉とブロッコリーの研究',
            userName: 'ラボ主任',
            date: '2024-02-19',
            pfc: { protein: 45, fat: 5, carbs: 10 },
            calories: 320,
            tags: ['高タンパク', '減量中'],
            memo: '皮なし鶏胸肉を使用。ビタミンC補給のためブロッコリーを多めに配合。',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
            nutrientsDetail: [
                { label: 'ビタミンC', value: 80, unit: 'mg', goal: 100 },
                { label: '食物繊維', value: 6, unit: 'g', goal: 20 },
                { label: '鉄分', value: 1.2, unit: 'mg', goal: 10 }
            ]
        },
        {
            id: 'e6b4f7a2-1d5c-4b3a-9e8f-7c1d2e3f4a5b',
            userId: '00000000-0000-0000-0000-000000000001',
            isMock: true,
            mealName: '玄米サーモンボウル',
            userName: '栄養士 A',
            date: '2024-02-19',
            pfc: { protein: 25, fat: 12, carbs: 40 },
            calories: 450,
            tags: ['健康研究', 'オメガ3'],
            memo: '良質な脂質（EPA/DHA）をターゲットにした構成。玄米によるGI値抑制を検証。',
            imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
            nutrientsDetail: [
                { label: 'オメガ3', value: 2.1, unit: 'g', goal: 2.0 },
                { label: 'カリウム', value: 450, unit: 'mg', goal: 2500 }
            ]
        },
        {
            id: 'f8d3e2c1-b4a5-4d6e-9c8f-0a1b2c3d4e5f',
            userId: '00000000-0000-0000-0000-000000000002',
            isMock: true,
            mealName: '朝のオートミール解析',
            userName: '時短研究員',
            date: '2024-02-18',
            pfc: { protein: 15, fat: 8, carbs: 45 },
            calories: 310,
            tags: ['時短', '食物繊維'],
            memo: '準備時間3分。水溶性食物繊維の摂取効率は非常に高い。',
            nutrientsDetail: [
                { label: '食物繊維', value: 8, unit: 'g', goal: 20 },
                { label: 'マグネシウム', value: 120, unit: 'mg', goal: 320 }
            ]
        },
        {
            id: 'a1b2c3d4-e5f6-4a5b-9c8d-e1f2a3b4c5d6',
            userId: '00000000-0000-0000-0000-000000000003',
            isMock: true,
            mealName: 'ケトジェニック・ステーキ',
            userName: 'ケトマスター',
            date: '2024-02-18',
            pfc: { protein: 40, fat: 35, carbs: 5 },
            calories: 550,
            tags: ['ケト', '高脂質'],
            memo: '炭水化物を極限までカット。良質なグラスフェッドビーフを使用。',
            methodTag: 'keto',
            isRecommended: true,
            nutrientsDetail: [
                { label: '亜鉛', value: 6, unit: 'mg', goal: 10 },
                { label: '鉄分', value: 3.5, unit: 'mg', goal: 10 }
            ]
        },
        {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6',
            userId: '00000000-0000-0000-0000-000000000004',
            isMock: true,
            mealName: 'ファスティング明けの回復食',
            userName: '断食道場',
            date: '2024-02-17',
            pfc: { protein: 10, fat: 2, carbs: 30 },
            calories: 180,
            tags: ['回復食', '消化に良い'],
            memo: '16時間断食後の最初の食事。重湯と梅干しで胃腸を慣らす。',
            methodTag: 'fasting',
            isRecommended: true,
            nutrientsDetail: [
                { label: 'ナトリウム', value: 400, unit: 'mg', goal: 2000 }
            ]
        },
        {
            id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
            userId: '00000000-0000-0000-0000-000000000005',
            isMock: true,
            mealName: '脂質制限・白身魚のグリル',
            userName: 'ローファット研究員',
            date: '2024-02-17',
            pfc: { protein: 35, fat: 3, carbs: 45 },
            calories: 360,
            tags: ['低脂質', '高タンパク'],
            memo: '脂質を極力抑え、タンパク質とカーボを確保するクラシックなボディビル食。',
            methodTag: 'low_fat',
            nutrientsDetail: [
                { label: 'ビタミンD', value: 5, unit: 'µg', goal: 8.5 }
            ],
            likesCount: 12,
            commentsCount: 3
        }
    ]);

    const loadProfile = useCallback(async () => {
        try {
            const savedSettings = await AsyncStorage.getItem('userSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setProfile({
                    nickname: parsed.nickname || 'ゲスト',
                    gender: parsed.gender,
                    age: parsed.age,
                    heightCm: parsed.heightCm,
                    weightKg: parsed.weightKg,
                    targetWeightKg: parsed.targetWeightKg,
                    activityLevel: parsed.activityLevel,
                    goal: parsed.goal,
                    pfcGoals: parsed.pfcGoals,
                    aiCoachSettings: parsed.aiCoachSettings || {
                        tone: 'professional',
                        warningSensitivity: 70
                    },
                    isPremium: parsed.isPremium || false,
                    streakCount: parsed.streakCount || 0,
                    rank: StreakService.getRank(parsed.streakCount || 0)
                });
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }, []);

    const loadTodaysMeals = useCallback(async (dateOverride?: string) => {
        try {
            const dateStr = dateOverride || new Date().toISOString().split('T')[0];
            const { data: { session } } = await supabase.auth.getSession();
            console.log('UserContext: loadTodaysMeals - session exists:', !!session);

            if (session) {
                try {
                    console.log('UserContext: Syncing with backend...');
                    const response = await foodApi.getDailyLogs(session.user.id, dateStr);
                    console.log('UserContext: Backend sync complete');
                    if (response && response.meals) {
                        const syncedMeals = response.meals;
                        setTodaysMeals(prev => {
                            if (JSON.stringify(prev) !== JSON.stringify(syncedMeals)) {
                                return syncedMeals;
                            }
                            return prev;
                        });
                        await AsyncStorage.setItem(`meals_${dateStr}`, JSON.stringify(syncedMeals));
                        return;
                    }
                } catch (apiError) {
                    console.warn('Backend sync failed, falling back to local storage', apiError);
                }
            }

            const savedMeals = await AsyncStorage.getItem(`meals_${dateStr}`);
            const mealsToSet = savedMeals ? JSON.parse(savedMeals) : [];
            setTodaysMeals(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(mealsToSet)) {
                    return mealsToSet;
                }
                return prev;
            });
        } catch (error) {
            console.error('Failed to load meals:', error);
        }
    }, []);

    const loadMealHistory = useCallback(async () => {
        try {
            const savedHistory = await AsyncStorage.getItem('meal_history');
            if (savedHistory) {
                setMealHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            console.error('Failed to load meal history:', error);
        }
    }, []);

    const addMeal = useCallback(async (newMeal: any) => {
        const dateStr = newMeal.date || new Date().toISOString().split('T')[0];
        const isToday = dateStr === new Date().toISOString().split('T')[0];

        try {
            const barcodeToUse = newMeal.barcode || newMeal.id || `manual_${Date.now()}`;
            const { data: { session } } = await supabase.auth.getSession();
            let backendId = null;
            if (session) {
                try {
                    const response = await foodApi.logMeal(
                        session.user.id,
                        barcodeToUse,
                        100,
                        newMeal.mealType || 'snack',
                        dateStr,
                        newMeal.name,
                        newMeal.calories,
                        newMeal.protein,
                        newMeal.fat,
                        newMeal.carbs
                    );
                    if (response && response.log && response.log.id) {
                        backendId = response.log.id;
                    }
                } catch (apiError) {
                    console.error('Failed to sync meal with backend', apiError);
                }
            }

            const cleanMeal = { ...newMeal, id: backendId || newMeal.id, barcode: barcodeToUse, date: dateStr };
            if (isToday) {
                setTodaysMeals(prev => [...prev, cleanMeal]);
            }

            const savedMeals = await AsyncStorage.getItem(`meals_${dateStr}`);
            const meals = savedMeals ? JSON.parse(savedMeals) : [];
            meals.push(cleanMeal);
            await AsyncStorage.setItem(`meals_${dateStr}`, JSON.stringify(meals));

            const newHistory = [cleanMeal, ...mealHistory.filter(h => h.name !== cleanMeal.name)].slice(0, 50);
            setMealHistory(newHistory);
            await AsyncStorage.setItem('meal_history', JSON.stringify(newHistory));
        } catch (error) {
            console.error('Failed to add meal:', error);
            throw error;
        }
    }, [mealHistory]);

    const deleteMeal = useCallback(async (mealId: string | number, date?: string) => {
        const dateStr = date || new Date().toISOString().split('T')[0];
        if (dateStr === new Date().toISOString().split('T')[0]) {
            setTodaysMeals(prev => prev.filter(m => m.id !== mealId));
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await foodApi.deleteMealLog(session.user.id, dateStr, mealId);
            }
            const savedMeals = await AsyncStorage.getItem(`meals_${dateStr}`);
            if (savedMeals) {
                const updatedMeals = JSON.parse(savedMeals).filter((m: any) => m.id !== mealId);
                await AsyncStorage.setItem(`meals_${dateStr}`, JSON.stringify(updatedMeals));
            }
        } catch (error) {
            console.error('Failed to delete meal:', error);
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        const newProfile = { ...profile, ...updates };
        setProfile(newProfile);
        try {
            await AsyncStorage.setItem('userSettings', JSON.stringify(newProfile));
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('profiles').upsert({
                    id: session.user.id,
                    nickname: newProfile.nickname,
                    gender: newProfile.gender,
                    age: newProfile.age,
                    height_cm: newProfile.heightCm,
                    weight_kg: newProfile.weightKg,
                    target_weight_kg: newProfile.targetWeightKg,
                    activity_level: newProfile.activityLevel,
                    daily_calorie_goal: newProfile.goal,
                    pfc_goals: newProfile.pfcGoals,
                    updated_at: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    }, [profile]);

    const loadSavedMenus = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('saved_menus').select('*, lab_reports (*)').eq('user_id', session.user.id);
            if (data) setSavedMenus(data as SavedMenu[]);
        } catch (error) { console.error(error); }
    }, []);

    const saveMenu = useCallback(async (reportId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('saved_menus').insert([{ user_id: session.user.id, report_id: reportId }]).select('*, lab_reports (*)').single();
            if (data) setSavedMenus(prev => [data as SavedMenu, ...prev]);
        } catch (error) { console.error(error); }
    }, []);

    const unsaveMenu = useCallback(async (reportId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            await supabase.from('saved_menus').delete().eq('user_id', session.user.id).eq('report_id', reportId);
            setSavedMenus(prev => prev.filter(m => m.report_id !== reportId));
        } catch (error) { console.error(error); }
    }, []);

    const loadLabStats = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('lab_reports').select('replicate_count, lab_likes(count)').eq('user_id', session.user.id);
            if (data) {
                const likes = data.reduce((sum, r) => sum + (r.lab_likes?.[0]?.count || 0), 0);
                const replicates = data.reduce((sum, r) => sum + (r.replicate_count || 0), 0);
                const points = likes + replicates;
                setLabStats({ usefulCount: likes, replicateCount: replicates, totalPoints: points, rank: points >= 100 ? 'PLATINUM' : points >= 30 ? 'GOLD' : points >= 10 ? 'SILVER' : 'STANDARD' });
            }
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        loadProfile();
        loadTodaysMeals();
        loadMealHistory();
        loadSavedMenus();
        loadLabStats();

        // IAP Purchase Update Listener
        const purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase: IAP.Purchase) => {
            // iOS (StoreKit 2) と Android どちらも purchaseToken に統合されている
            const receipt = purchase.purchaseToken;
            if (receipt) {
                try {
                    // TODO: 本番前にサーバー側でレシート検証を行うことを推奨
                    // 現状はクライアント側でトラストし、isPremium を true にする
                    await updateProfile({ isPremium: true });
                    await IAP.finishTransaction({ purchase, isConsumable: false });
                    Alert.alert('ありがとうございます！', 'プレミアムプランへの加入が完了しました。');
                } catch (ackErr) {
                    console.warn('finishTransaction error:', ackErr);
                }
            } else {
                console.warn('IAP: purchase received but no receipt found', purchase);
            }
        });

        const purchaseErrorSubscription = IAP.purchaseErrorListener((error: IAP.PurchaseError) => {
            console.warn('purchaseErrorListener', error);
            // UserCancelled はユーザーが自分でキャンセルしたため通知不要
            if (error.code !== IAP.ErrorCode.UserCancelled) {
                Alert.alert('購入エラー', error.message || '購入処理中にエラーが発生しました。');
            }
        });

        return () => {
            purchaseUpdateSubscription.remove();
            purchaseErrorSubscription.remove();
        };
    }, []);


    const contextValue = useMemo(() => ({
        profile, todaysMeals, mealHistory, updateProfile, loadProfile, addMeal, deleteMeal, loadTodaysMeals,
        labPosts, labStats, savedMenus, saveMenu, unsaveMenu, loadSavedMenus, loadLabStats
    }), [
        profile, todaysMeals, mealHistory, updateProfile, loadProfile, addMeal, deleteMeal, loadTodaysMeals,
        labPosts, labStats, savedMenus, saveMenu, unsaveMenu, loadSavedMenus, loadLabStats
    ]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};



export const useUser = () => {
    const context = React.useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
