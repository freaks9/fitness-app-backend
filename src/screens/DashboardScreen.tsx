
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountUpText } from '../components/CountUpText';
import { PressableScale } from '../components/PressableScale';
import { useAuth } from '../context/AuthContext';
import { useLanguageContext } from '../context/LanguageContext';
import { analyzeMeals_RuleBased } from '../services/aiAdvisorService';
import { deleteExerciseLog, ExerciseLog, getExerciseLogs } from '../services/exerciseService';
import { getDailyLogs } from '../services/foodApiService';

const screenWidth = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }: any) => {
    const { user } = useAuth(); // Import useAuth
    const { t } = useLanguageContext();
    const [pfcGoals, setPfcGoals] = useState({ protein: 0, fat: 0, carbs: 0 });
    const [eatenPfc, setEatenPfc] = useState({ protein: 0, fat: 0, carbs: 0 });

    // Restored State Variables
    const [goal, setGoal] = useState(2000);
    const [eaten, setEaten] = useState(0);
    const [currentWeight, setCurrentWeight] = useState<number | null>(null);
    const [weightHistory, setWeightHistory] = useState<{ date: string, weight: number }[]>([]);
    const [todaysMeals, setTodaysMeals] = useState<any[]>([]);
    const [todaysExercises, setTodaysExercises] = useState<ExerciseLog[]>([]);
    const [totalExerciseBurn, setTotalExerciseBurn] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // AI Advice State
    const [adviceModalVisible, setAdviceModalVisible] = useState(false);
    const [adviceList, setAdviceList] = useState<string[]>([]);

    // Set up navigation header with Settings and Scanner buttons
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Scanner', { date: selectedDate.toISOString().split('T')[0], mealType: 'snack' })} style={{ marginRight: 15 }}>
                        <Ionicons name="barcode-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 15 }}>
                        <Ionicons name="settings-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, selectedDate]);

    const loadData = useCallback(async () => {
        try {
            // Load Settings
            const savedSettings = await AsyncStorage.getItem('userSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                if (parsed.goal) setGoal(parsed.goal);
                if (parsed.weight) setCurrentWeight(parseFloat(parsed.weight));

                // Ensure PFC goals exist, otherwise provide defaults or calculate (simple default here)
                if (parsed.pfcGoals && (parsed.pfcGoals.protein > 0 || parsed.pfcGoals.fat > 0 || parsed.pfcGoals.carbs > 0)) {
                    setPfcGoals(parsed.pfcGoals);
                } else {
                    // Fallback if not calculated yet (e.g. from old version)
                    // Simple generic breakdown: 2000kcal -> P:100g, F:60g, C:250g roughly
                    setPfcGoals({ protein: 100, fat: 60, carbs: 250 });
                }
            }

            let meals = [];

            // Priority: Backend Data > Local Storage
            const dateStr = selectedDate.toISOString().split('T')[0];
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            if (user && isToday) { // Currently backend only supports /today. Ideally add date param to API.
                // For MVP, if selected date is TODAY, try fetch from backend
                try {
                    const response = await getDailyLogs(user.id);
                    if (response && response.meals) {
                        meals = response.meals; // Backend meals
                    }
                } catch (apiError) {
                    console.log("API fetch failed, falling back to local", apiError);
                }
            }

            // ALWAYS load local meals (Manual entries) and merge/deduplicate
            const localMealsJson = await AsyncStorage.getItem(`meals_${dateStr}`);
            const localMeals = localMealsJson ? JSON.parse(localMealsJson) : [];

            // Merge strategy: 
            // Local meals have numeric/string ID (Date.now()). Backend meals have UUID or different ID.
            // If we blindly merge, we might duplicate if we implemented syncing. 
            // But currently we DON'T sync local manual entries to backend.
            // So Backend has "Search Items" and Local has "Manual Items".
            // We should show BOTH.

            // Filter out backend items from local? No, local doesn't have backend items usually, 
            // unless we save 'off_' items to local too.
            // In MealEntryScreen, we saved EVERYTHING to local storage!
            // "const updatedMeals = [...existingMeals, newMeal];"

            // So Local Storage contains EVERYTHING (Manual + Search).
            // Backend contains ONLY Search items (if we implemented logMeal, which we haven't fully for manual).

            // Issue: Dashboard prioritizes Backend loops. 
            // "if (response) meals = response.meals" -> Overwrites local. 
            // AND Backend has 0 items (because we haven't fixed logMeal yet).
            // So Dashboard shows 0.

            // FIX: Prioritize LOCAL STORAGE for now since it has everything.
            // Only use Backend for "Cloud Sync" backup or if Local is empty.

            // Override meals with localMeals
            meals = localMeals;
            // Note: If we wanted to merge, we would do: meals = [...localMeals, ...backendunique];

            setTodaysMeals(meals);
            // OR merge them carefully.

            // Given the current state (MealEntry saves everything to AsyncStorage), 
            // relying on AsyncStorage is Safer for the USER OBJECTIVE "Reflected in Dashboard".

            meals = localMeals;

            // If we want to use backend data, we should verify it matches local.
            // For now, let's stick to Local to fix the bug immediately.

            setTodaysMeals(meals);
            const totalCalories = meals.reduce((sum: number, meal: any) => sum + (parseInt(meal.calories) || 0), 0);
            setEaten(totalCalories);

            // Calculate eaten PFC
            const totalP = meals.reduce((sum: number, meal: any) => sum + (parseFloat(meal.protein) || 0), 0);
            const totalF = meals.reduce((sum: number, meal: any) => sum + (parseFloat(meal.fat) || 0), 0);
            const totalC = meals.reduce((sum: number, meal: any) => sum + (parseFloat(meal.carbs) || 0), 0);
            setEatenPfc({ protein: Math.round(totalP), fat: Math.round(totalF), carbs: Math.round(totalC) });

            // Load Exercises
            const exercises = await getExerciseLogs(dateStr);
            setTodaysExercises(exercises);
            const totalBurn = exercises.reduce((sum: number, ex: ExerciseLog) => sum + ex.caloriesBurned, 0);
            setTotalExerciseBurn(totalBurn);

            // Load Weight History
            const weightHistoryJson = await AsyncStorage.getItem('weight_history');
            if (weightHistoryJson) {
                setWeightHistory(JSON.parse(weightHistoryJson));
            }
        } catch (e) {
            console.error('Failed to load dashboard data', e);
        }
    }, [selectedDate, user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const remaining = Math.max(0, (goal + totalExerciseBurn) - eaten);

    const deleteMeal = (mealIndex: number, mealType: string) => {
        Alert.alert(
            t('deleteMeal'),
            t('confirmDelete'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Filter out the item at mealIndex from the specific mealType
                            // NOTE: todaysMeals is the flat list. We need to find the specific item or just filter from all meals.
                            // The easier way given current structure is to filter todaysMeals by removing the item that matches.

                            // Re-filter to get section meals to find the correct one to delete
                            const sectionMeals = todaysMeals.filter((m: any) => m.mealType === mealType);
                            const mealToDelete = sectionMeals[mealIndex];

                            if (!mealToDelete) return;

                            const updatedMeals = todaysMeals.filter((m: any) => m !== mealToDelete);

                            setTodaysMeals(updatedMeals);

                            // Update eaten totals
                            const dateStr = selectedDate.toISOString().split('T')[0];
                            await AsyncStorage.setItem(`meals_${dateStr} `, JSON.stringify(updatedMeals));

                            // Recalculate totals immediately for UI
                            const totalCalories = updatedMeals.reduce((sum: number, meal: any) => sum + (parseInt(meal.calories) || 0), 0);
                            setEaten(totalCalories);
                            const totalP = updatedMeals.reduce((sum: number, meal: any) => sum + (parseFloat(meal.protein) || 0), 0);
                            const totalF = updatedMeals.reduce((sum: number, meal: any) => sum + (parseFloat(meal.fat) || 0), 0);
                            const totalC = updatedMeals.reduce((sum: number, meal: any) => sum + (parseFloat(meal.carbs) || 0), 0);
                            setEatenPfc({ protein: Math.round(totalP), fat: Math.round(totalF), carbs: Math.round(totalC) });

                        } catch (e) {
                            console.error("Failed to delete meal", e);
                        }
                    }
                }
            ]
        );
    };

    // Meal Sections Helper
    const renderMealSection = (type: string, title: string) => {
        const sectionMeals = todaysMeals.filter((m: any) => m.mealType === type);
        return (
            <View style={styles.mealSection}>
                <View style={styles.mealSectionHeader}>
                    <Text style={styles.mealSectionTitle}>{title}</Text>
                    <Text style={styles.mealSectionCalories}>
                        {sectionMeals.reduce((sum: number, m: any) => sum + (parseInt(m.calories) || 0), 0)} kcal
                    </Text>
                </View>
                {sectionMeals.map((meal, index) => (
                    <View key={index} style={styles.mealRow}>
                        <View style={styles.mealInfo}>
                            <Text style={styles.mealName}>{meal.name}</Text>
                            <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteMeal(index, type)}
                        >
                            <Text style={styles.deleteButtonText}>−</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity
                    style={styles.addMealButton}
                    onPress={() => navigation.navigate('MealEntry', { date: selectedDate.toISOString().split('T')[0], mealType: type })}
                >
                    <Text style={styles.addMealButtonText}>+ {t('add')}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const chartConfig = {
        backgroundGradientFrom: "#fff",
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: "#fff",
        backgroundGradientToOpacity: 0,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
    };

    const completeDay = () => {
        if (!currentWeight) {
            Alert.alert(t('error'), t('pleaseSetWeight'));
            return;
        }

        const deficit = goal - eaten;
        // 1kg fat approx 7200kcal
        // daily weight change (kg) = deficit / 7200
        const dailyWeightChange = deficit / 7200;
        const projectedWeightChange = dailyWeightChange * 35; // 5 weeks
        const projectedWeight = currentWeight - projectedWeightChange;

        Alert.alert(
            t('prediction'),
            `${t('predictionMessage', { weeks: 5, weight: projectedWeight.toFixed(1) })} `
        );
    };

    const recordWeight = () => {
        Alert.prompt(
            t('recordWeight'),
            t('enterWeight'),
            [
                {
                    text: t('cancel'),
                    style: 'cancel',
                },
                {
                    text: t('ok'),
                    onPress: async (weightStr?: string) => {
                        const weight = parseFloat(weightStr || '');
                        if (!isNaN(weight) && weight > 0) {
                            try {
                                setCurrentWeight(weight);

                                // Save to weight history
                                const dateStr = selectedDate.toISOString().split('T')[0];
                                const newHistory = [...weightHistory.filter(item => item.date !== dateStr), { date: dateStr, weight }];
                                newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                setWeightHistory(newHistory);
                                await AsyncStorage.setItem('weight_history', JSON.stringify(newHistory));

                                // Update current settings weight as well
                                const savedSettings = await AsyncStorage.getItem('userSettings');
                                if (savedSettings) {
                                    const parsed = JSON.parse(savedSettings);
                                    parsed.weight = weight.toString();
                                    await AsyncStorage.setItem('userSettings', JSON.stringify(parsed));
                                }
                            } catch (e) {
                                console.error('Failed to save weight', e);
                            }
                        } else {
                            Alert.alert(t('error'), t('invalidInput'));
                        }
                    },
                },
            ],
            'plain-text',
            currentWeight ? currentWeight.toString() : ''
        );
    };

    const handleGetAdvice = () => {
        const advice = analyzeMeals_RuleBased(todaysMeals, { calories: goal, pfc: pfcGoals }, t as any);
        setAdviceList(advice);
        setAdviceModalVisible(true);
    };

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header: Date & Circular Progress */}
                <View style={styles.headerContainer}>
                    <View style={styles.dateRow}>
                        <TouchableOpacity onPress={() => changeDate(-1)}><Text style={styles.dateArrow}>{'<'}</Text></TouchableOpacity>
                        <Text style={styles.dateText}>{selectedDate.toISOString().split('T')[0]}</Text>
                        <TouchableOpacity onPress={() => changeDate(1)}><Text style={styles.dateArrow}>{'>'}</Text></TouchableOpacity>
                    </View>

                    {/* Circular Indicator Area with Donut Chart */}
                    <View style={styles.circleContainer}>
                        <PieChart
                            data={
                                remaining > 0
                                    ? [
                                        { value: eaten, color: '#E0E0E0' },
                                        { value: remaining, color: '#007AFF' }
                                    ]
                                    : [{ value: 1, color: '#FF3B30' }]
                            }
                            donut
                            radius={90}
                            innerRadius={75}
                            centerLabelComponent={() => (
                                <View style={{ alignItems: 'center' }}>
                                    <CountUpText
                                        value={remaining}
                                        style={{ fontSize: 32, fontWeight: 'bold', color: remaining < 0 ? '#FF3B30' : '#333' }}
                                    />
                                    <Text style={{ fontSize: 14, color: '#666' }}>{t('remaining')}</Text>
                                </View>
                            )}
                        />
                    </View>

                    {/* Formula */}
                    <View style={styles.formulaContainer}>
                        <View style={styles.formulaItem}>
                            <Text style={styles.formulaValue}>{goal}</Text>
                            <Text style={styles.formulaLabel}>{t('goal')}</Text>
                        </View>
                        <Text style={styles.formulaOperator}>+</Text>
                        <View style={styles.formulaItem}>
                            <Text style={styles.formulaValue}>{totalExerciseBurn}</Text>
                            <Text style={styles.formulaLabel}>{t('exercise')}</Text>
                        </View>
                        <Text style={styles.formulaOperator}>-</Text>
                        <View style={styles.formulaItem}>
                            <Text style={styles.formulaValue}>{eaten}</Text>
                            <Text style={styles.formulaLabel}>{t('intake')}</Text>
                        </View>
                        <Text style={styles.formulaOperator}>=</Text>
                        <View style={styles.formulaItem}>
                            <Text style={[styles.formulaValue, { color: '#007AFF' }]}>{remaining}</Text>
                            <Text style={styles.formulaLabel}>{t('remaining')}</Text>
                        </View>
                    </View>
                </View>

                {/* AI Advice Button - Prominent */}
                <PressableScale style={styles.adviceButton} onPress={handleGetAdvice}>
                    <Text style={styles.adviceButtonText}>✨ {t('getAdvice')}</Text>
                </PressableScale>

                {/* PFC Progress Bars */}
                <View style={styles.pfcContainer}>
                    <View style={styles.pfcItem}>
                        <Text style={styles.pfcLabel}>{t('protein')}</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, (eatenPfc.protein / (pfcGoals.protein || 1)) * 100)}%`, backgroundColor: '#FF9500' }]} />
                        </View>
                        <Text style={styles.pfcValue}>{eatenPfc.protein} / {pfcGoals.protein}{t('g')}</Text>
                    </View>
                    <View style={styles.pfcItem}>
                        <Text style={styles.pfcLabel}>{t('fat')}</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, (eatenPfc.fat / (pfcGoals.fat || 1)) * 100)}%`, backgroundColor: '#FF2D55' }]} />
                        </View>
                        <Text style={styles.pfcValue}>{eatenPfc.fat} / {pfcGoals.fat}{t('g')}</Text>
                    </View>
                    <View style={styles.pfcItem}>
                        <Text style={styles.pfcLabel}>{t('carbs')}</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, (eatenPfc.carbs / (pfcGoals.carbs || 1)) * 100)}%`, backgroundColor: '#34C759' }]} />
                        </View>
                        <Text style={styles.pfcValue}>{eatenPfc.carbs} / {pfcGoals.carbs}{t('g')}</Text>
                    </View>
                </View>

                {/* Exercise Section */}
                <View style={styles.mealsContainer}>
                    <View style={styles.mealSection}>
                        <View style={styles.mealSectionHeader}>
                            <Text style={styles.mealSectionTitle}>{t('exercise')}</Text>
                            <Text style={styles.mealSectionCalories}>{totalExerciseBurn} kcal</Text>
                        </View>
                        {todaysExercises.map((ex) => (
                            <View key={ex.id} style={styles.mealRow}>
                                <View style={styles.mealInfo}>
                                    <Text style={styles.mealName}>{ex.name}</Text>
                                    <Text style={styles.mealCalories}>{ex.caloriesBurned} kcal / {ex.durationMinutes} min</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => {
                                        Alert.alert(t('deleteExercise'), t('confirmDeleteExercise'), [
                                            { text: t('cancel'), style: 'cancel' },
                                            {
                                                text: t('delete'), style: 'destructive', onPress: async () => {
                                                    await deleteExerciseLog(selectedDate.toISOString().split('T')[0], ex.id);
                                                    loadData(); // Reload
                                                }
                                            }
                                        ]);
                                    }}
                                >
                                    <Text style={styles.deleteButtonText}>−</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity
                            style={styles.addMealButton}
                            onPress={() => navigation.navigate('ExerciseEntry', { date: selectedDate.toISOString().split('T')[0] })}
                        >
                            <Text style={styles.addMealButtonText}>+ {t('addExercise')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Meal Sections */}
                <View style={styles.mealsContainer}>
                    {renderMealSection('breakfast', t('breakfast'))}
                    {renderMealSection('lunch', t('lunch'))}
                    {renderMealSection('dinner', t('dinner'))}
                    {renderMealSection('snack', t('snack'))}
                </View>

                {/* Footer Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Settings')}>
                        <Text style={styles.secondaryButtonText}>{t('settings')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={recordWeight}>
                        <Text style={styles.secondaryButtonText}>{t('recordWeight')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={completeDay}>
                        <Text style={styles.secondaryButtonText}>{t('completeDay')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Weight History Small Chart (Optional - kept for value) */}
                {weightHistory.length > 0 && (
                    <View style={styles.miniChartContainer}>
                        <Text style={styles.sectionTitle}>{t('weightHistory')}</Text>
                        <LineChart
                            data={{
                                labels: weightHistory.slice(-5).map(d => d.date.substring(5)),
                                datasets: [{ data: weightHistory.slice(-5).map(d => d.weight) }]
                            }}
                            width={screenWidth - 40}
                            height={160} // Smaller
                            chartConfig={chartConfig}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                            withDots={false}
                            withInnerLines={false}
                        />
                    </View>
                )}
                {/* AI Advice Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={adviceModalVisible}
                    onRequestClose={() => setAdviceModalVisible(false)}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{t('aiAdvice')}</Text>
                        <ScrollView style={{ width: '100%' }}>
                            {adviceList.map((item, index) => (
                                <View key={index} style={styles.adviceItem}>
                                    <Text style={styles.adviceText}>• {item}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.closeButton]}
                            onPress={() => setAdviceModalVisible(false)}
                        >
                            <Text style={styles.textStyle}>{t('close')}</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f5f5f5',
        paddingBottom: 40,
        flexGrow: 1,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        alignItems: 'center',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
    },
    dateArrow: {
        fontSize: 24,
        paddingHorizontal: 15,
        color: '#007AFF',
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    circleContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleTextContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    remainingCalories: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
    },
    remainingLabel: {
        fontSize: 14,
        color: '#666',
    },
    formulaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '90%',
        marginTop: 10,
    },
    formulaItem: {
        alignItems: 'center',
    },
    formulaValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    formulaLabel: {
        fontSize: 12,
        color: '#888',
    },
    formulaOperator: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#888',
        marginTop: 0,
    },
    pfcContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: '#fff',
        marginTop: 15,
        marginHorizontal: 15,
        borderRadius: 15,
    },
    pfcItem: {
        width: '30%',
        alignItems: 'center',
    },
    pfcLabel: {
        fontSize: 12,
        marginBottom: 5,
        fontWeight: '600',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#eee',
        borderRadius: 4,
        marginBottom: 5,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    pfcValue: {
        fontSize: 10,
        color: '#666',
    },
    mealsContainer: {
        padding: 15,
    },
    mealSection: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
    },
    mealSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 5,
    },
    mealSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    mealSectionCalories: {
        fontSize: 16,
        color: '#666',
    },
    mealRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    mealInfo: {
        flex: 1,
    },
    mealName: {
        fontSize: 16,
        color: '#333',
    },
    mealCalories: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        lineHeight: 22,
    },
    addMealButton: {
        marginTop: 15,
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    addMealButtonText: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        flexWrap: 'wrap',
        gap: 10,
    },
    secondaryButton: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    secondaryButtonText: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    miniChartContainer: {
        marginHorizontal: 15,
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    adviceButton: {
        marginHorizontal: 15,
        marginTop: 10,
        backgroundColor: '#6C5CE7',
        padding: 12,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    adviceButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalView: {
        flex: 1,
        marginTop: 100,
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold"
    },
    adviceItem: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    adviceText: {
        fontSize: 16,
        lineHeight: 24,
    },
    closeButton: {
        backgroundColor: "#2196F3",
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        marginTop: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    }
});

export default DashboardScreen;
