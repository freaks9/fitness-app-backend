import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, History, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { FoodItem } from '../data/japaneseFood';
import { searchFood } from '../services/foodApiService';

const HISTORY_KEY = 'food_search_history';

const MealEntryScreen = ({ navigation, route }: any) => {
    const { t } = useLanguageContext();
    const { addMeal: addMealContext } = useUser();

    const [mealName, setMealName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [fat, setFat] = useState('');
    const [carbs, setCarbs] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
    const [apiResults, setApiResults] = useState<FoodItem[]>([]);
    const [isSearchingApi, setIsSearchingApi] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const [myFoods, setMyFoods] = useState<FoodItem[]>([]);
    const [history, setHistory] = useState<FoodItem[]>([]);
    const [quantity, setQuantity] = useState('1');
    const [savedBarcode, setSavedBarcode] = useState<string | null>(null);
    const [baseNutrients, setBaseNutrients] = useState({ calories: 0, protein: 0, fat: 0, carbs: 0 });
    const [imageUri, setImageUri] = useState<string | null>(null);

    const loadMyFoods = async () => {
        try {
            const stored = await AsyncStorage.getItem('my_foods');
            if (stored) {
                setMyFoods(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load my foods', e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({ title: t('addMeal') });
            loadMyFoods();
            const loadLatestHistory = async () => {
                try {
                    const storedHistory = await AsyncStorage.getItem(HISTORY_KEY);
                    if (storedHistory) setHistory(JSON.parse(storedHistory));
                } catch (error) {
                    console.error('Failed to load history:', error);
                }
            };
            loadLatestHistory();
        }, [navigation, t])
    );

    const saveToLocalHistory = async (foodItem: FoodItem) => {
        try {
            const filtered = history.filter(item => item.name !== foodItem.name);
            const newHistory = [foodItem, ...filtered].slice(0, 10);
            setHistory(newHistory);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        } catch (e) {
            console.error('Failed to save to local history', e);
        }
    };

    const clearLocalHistory = async () => {
        try {
            await AsyncStorage.removeItem(HISTORY_KEY);
            setHistory([]);
        } catch (e) {
            console.error('Failed to clear history', e);
        }
    };

    useEffect(() => {
        if (route.params?.prefilledName) setMealName(route.params.prefilledName);
        if (route.params?.prefilledCalories || route.params?.prefilledProtein) {
            const cal = route.params?.prefilledCalories?.toString() || '0';
            const prot = route.params?.prefilledProtein?.toString() || '0';
            const ft = route.params?.prefilledFat?.toString() || '0';
            const crb = route.params?.prefilledCarbs?.toString() || '0';

            setCalories(cal);
            setProtein(prot);
            setFat(ft);
            setCarbs(crb);

            setBaseNutrients({
                calories: parseFloat(cal) || 0,
                protein: parseFloat(prot) || 0,
                fat: parseFloat(ft) || 0,
                carbs: parseFloat(crb) || 0
            });
            setQuantity('1');
        }
        if (route.params?.imageUri) setImageUri(route.params.imageUri);
        if (route.params?.scannedBarcode) setSavedBarcode(route.params.scannedBarcode);
        if (route.params?.triggerSearch) {
            setModalVisible(true);
            if (route.params?.prefilledName) {
                setSearchQuery(route.params.prefilledName);
                handleSearch(route.params.prefilledName);
            }
        }
    }, [route.params]);

    useEffect(() => {
        if (route.params?.mealType) {
            setMealType(route.params.mealType);
            return;
        }
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) setMealType('breakfast');
        else if (hour >= 11 && hour < 17) setMealType('lunch');
        else if (hour >= 17 && hour < 22) setMealType('dinner');
        else setMealType('snack');
    }, [route.params?.mealType]);

    const addMealData = async () => {
        const cal = parseInt(calories);
        if (!mealName || isNaN(cal)) {
            Alert.alert(t('error'), t('pleaseEnterAllFields') || '食事名とカロリーを正しく入力してください。');
            return;
        }

        const p = parseFloat(protein) || 0;
        const f = parseFloat(fat) || 0;
        const c = parseFloat(carbs) || 0;

        setLoading(true);
        try {
            const dateToUse = route.params?.date ? new Date(route.params.date) : new Date();
            const dateStr = dateToUse.toISOString().split('T')[0];

            let barcodeToUse = savedBarcode || route.params?.scannedBarcode || `manual_${Date.now()}`;

            // Save to Global Context (Which now handles backend sync)
            const newMeal = {
                id: Date.now().toString(),
                name: mealName,
                barcode: barcodeToUse,
                calories: cal,
                protein: p,
                fat: f,
                carbs: c,
                mealType,
                imageUri,
                date: dateStr
            };

            await addMealContext(newMeal);

            // Save to "My Foods" for future selection
            const newFoodItem: FoodItem = {
                id: barcodeToUse,
                name: mealName,
                calories: cal,
                protein: p,
                fat: f,
                carbs: c,
                category: 'Other'
            };

            const updatedMyFoods = [...myFoods];
            if (!updatedMyFoods.some(f => f.name === newFoodItem.name && f.calories === newFoodItem.calories)) {
                updatedMyFoods.push(newFoodItem);
                await AsyncStorage.setItem('my_foods', JSON.stringify(updatedMyFoods));
            }

            Alert.alert(t('success'), `Meal added for ${dateStr}!`);
            navigation.popToTop();
        } catch (e) {
            console.error(e);
            Alert.alert(t('error'), 'Failed to add meal.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (text.trim().length === 0) {
            setApiResults([]);
            setIsSearchingApi(false);
            return;
        }

        setIsSearchingApi(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const results = await searchFood(text);
                const mappedResults: FoodItem[] = results.map((item: any, index: number) => ({
                    id: `off_${item.barcode}_${index}`,
                    name: item.name,
                    calories: Math.round(item.calories),
                    protein: Math.round(item.protein),
                    fat: Math.round(item.fat),
                    carbs: Math.round(item.carbs),
                    category: 'Other'
                }));
                setApiResults(mappedResults);
            } catch (error) {
                console.error('Search Error:', error);
            } finally {
                setIsSearchingApi(false);
            }
        }, 600) as any;
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    const selectFood = (item: FoodItem) => {
        setMealName(item.name);
        setSavedBarcode(item.id);
        setCalories(item.calories.toString());
        setProtein(item.protein?.toString() || '0');
        setFat(item.fat?.toString() || '0');
        setCarbs(item.carbs?.toString() || '0');
        setBaseNutrients({
            calories: item.calories,
            protein: item.protein || 0,
            fat: item.fat || 0,
            carbs: item.carbs || 0
        });
        setQuantity('1');
        saveToLocalHistory(item);
        setModalVisible(false);
    };

    const updateQuantity = (val: string) => {
        setQuantity(val);
        const q = parseFloat(val);
        if (!isNaN(q) && q > 0) {
            setCalories(Math.round(baseNutrients.calories * q).toString());
            setProtein((baseNutrients.protein * q).toFixed(1));
            setFat((baseNutrients.fat * q).toFixed(1));
            setCarbs((baseNutrients.carbs * q).toFixed(1));
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{t('addMealTitle')}</Text>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topCloseButton}>
                            <X color="#64748B" size={24} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>{t('mealType')}</Text>
                    <View style={styles.mealTypeContainer}>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.mealTypeButton, mealType === type && styles.mealTypeButtonSelected]}
                                onPress={() => setMealType(type)}
                            >
                                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextSelected]}>{t(type)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {imageUri && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('mealName')}</Text>
                        <TextInput style={styles.input} value={mealName} onChangeText={setMealName} placeholder={t('mealNamePlaceholder') || "例: 鶏肉のサラダ"} />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('quantity')}</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={quantity} onChangeText={updateQuantity} />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('calories') || 'エネルギー'} (kcal)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={calories} onChangeText={setCalories} />
                    </View>

                    <Text style={styles.label}>PFCバランス (g)</Text>
                    <View style={styles.pfcRow}>
                        <View style={styles.pfcInputWrapper}>
                            <Text style={styles.pfcInputLabel}>P</Text>
                            <TextInput style={[styles.input, styles.pfcInput]} placeholder="0.0" keyboardType="numeric" value={protein} onChangeText={setProtein} />
                        </View>
                        <View style={styles.pfcInputWrapper}>
                            <Text style={styles.pfcInputLabel}>F</Text>
                            <TextInput style={[styles.input, styles.pfcInput]} placeholder="0.0" keyboardType="numeric" value={fat} onChangeText={setFat} />
                        </View>
                        <View style={styles.pfcInputWrapper}>
                            <Text style={styles.pfcInputLabel}>C</Text>
                            <TextInput style={[styles.input, styles.pfcInput]} placeholder="0.0" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.searchBtn} onPress={() => setModalVisible(true)}>
                        <Text style={styles.searchBtnText}>🔍 {t('searchDatabase') || 'データベースを検索'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.addButton} onPress={addMealData} disabled={loading}>
                        <Text style={styles.addButtonText}>{loading ? (t('saving') || '保存中...') : (t('add') || '登録する')}</Text>
                    </TouchableOpacity>
                </View>

                <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('selectFood') || '食品を選択'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeIconButton}>
                                <X color="#64748B" size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.searchContainerRow}>
                                <View style={styles.searchBarContainer}>
                                    <Search color="#94A3B8" size={20} style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.modalSearchInput}
                                        placeholder={t('searchPlaceholder') || "食品名を入力..."}
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        placeholderTextColor="#94A3B8"
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => handleSearch('')}>
                                            <X color="#94A3B8" size={18} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                    <Text style={styles.cancelButtonText}>{t('cancel') || 'キャンセル'}</Text>
                                </TouchableOpacity>
                            </View>

                            {isSearchingApi ? (
                                <View style={styles.searchingContainer}>
                                    <ActivityIndicator size="large" color="#1E88E5" />
                                    <Text style={styles.searchingText}>{t('searching') || 'データベースを検索中...'}</Text>
                                </View>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    {searchQuery.length === 0 ? (
                                        <>
                                            {history.length > 0 && (
                                                <View style={styles.historySection}>
                                                    <View style={styles.sectionTitleRow}>
                                                        <Text style={styles.sectionLabel}>{t('recentSearches') || '最近の検索'}</Text>
                                                        <TouchableOpacity onPress={clearLocalHistory}>
                                                            <Text style={styles.clearText}>{t('clearHistory') || '消去'}</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    {history.map((item, i) => (
                                                        <TouchableOpacity key={i} style={styles.historySearchItem} onPress={() => selectFood(item)}>
                                                            <History color="#94A3B8" size={18} style={{ marginRight: 12 }} />
                                                            <Text style={styles.historySearchName}>{item.name}</Text>
                                                            <ChevronRight color="#CBD5E1" size={16} />
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        <View style={styles.resultsSection}>
                                            {apiResults.map((item, i) => (
                                                <TouchableOpacity key={i} style={styles.resultItem} onPress={() => selectFood(item)}>
                                                    <View style={styles.resultIconWrapper}>
                                                        <Search color="#1E88E5" size={18} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.foodName}>{item.name}</Text>
                                                        <Text style={styles.foodCal}>{item.calories} kcal</Text>
                                                    </View>
                                                    <ChevronRight color="#CBD5E1" size={18} />
                                                </TouchableOpacity>
                                            ))}
                                            {apiResults.length === 0 && !isSearchingApi && (
                                                <View style={styles.emptyResults}>
                                                    <Text style={styles.noResultsText}>{t('noResults') || '見つかりませんでした'}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </SafeAreaView>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView >
    );
};

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: '#F8FAFC' },
    container: { padding: 20 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: { fontSize: 24, fontWeight: 'bold' },
    topCloseButton: { padding: 4 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    mealTypeContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    mealTypeButton: { flex: 1, padding: 10, backgroundColor: '#E2E8F0', borderRadius: 10, alignItems: 'center' },
    mealTypeButtonSelected: { backgroundColor: '#1E88E5' },
    mealTypeText: { color: '#475569' },
    mealTypeTextSelected: { color: '#FFF' },
    inputContainer: { marginBottom: 15 },
    input: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    pfcRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    pfcInputWrapper: { flex: 1, alignItems: 'center' },
    pfcInputLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },
    pfcInput: { width: '100%', textAlign: 'center' },
    searchBtn: { padding: 15, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', marginBottom: 20 },
    searchBtnText: { color: '#1E88E5', fontWeight: 'bold' },
    addButton: { backgroundColor: '#1E88E5', padding: 18, borderRadius: 15, alignItems: 'center' },
    addButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    imagePreviewContainer: { marginBottom: 20, borderRadius: 15, overflow: 'hidden' },
    imagePreview: { width: '100%', height: 200, borderRadius: 15 },
    modalContent: { paddingHorizontal: 20, flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    closeIconButton: { padding: 4 },
    searchContainerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        gap: 12,
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 15,
        height: 54,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cancelButton: {
        paddingHorizontal: 4,
    },
    cancelButtonText: {
        color: '#1E88E5',
        fontSize: 16,
        fontWeight: '600',
    },
    searchIcon: { marginRight: 10 },
    modalSearchInput: { flex: 1, fontSize: 16, color: '#0F172A' },
    searchingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    searchingText: {
        marginTop: 16,
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '500',
    },
    historySection: { marginTop: 10 },
    sectionTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 10,
    },
    sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    clearText: { fontSize: 14, color: '#1E88E5', fontWeight: '600' },
    historySearchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    historySearchName: { flex: 1, fontSize: 16, color: '#1E293B' },
    resultsSection: { marginTop: 10 },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    resultIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#1E88E510',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    foodName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
    foodCal: { fontSize: 14, color: '#64748B' },
    emptyResults: {
        paddingVertical: 100,
        alignItems: 'center',
    },
    noResultsText: {
        color: '#94A3B8',
        fontSize: 16,
    },
});

export default MealEntryScreen;
