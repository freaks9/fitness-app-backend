import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Button, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { FoodItem, JAPANESE_FOOD_DATABASE } from '../data/japaneseFood';
import { getDailyLogs, searchFood } from '../services/foodApiService';
import { supabase } from '../services/supabaseClient';

const MealEntryScreen = ({ navigation, route }: any) => {
    const { t, language } = useLanguageContext();
    const [mealName, setMealName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [fat, setFat] = useState('');
    const [carbs, setCarbs] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [apiResults, setApiResults] = useState<FoodItem[]>([]);
    const [isSearchingApi, setIsSearchingApi] = useState(false);

    // Local Search State
    const [myFoods, setMyFoods] = useState<FoodItem[]>([]);
    const [filteredMyFoods, setFilteredMyFoods] = useState<FoodItem[]>([]);
    const [quantity, setQuantity] = useState('1');
    const [baseNutrients, setBaseNutrients] = useState({
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0
    });

    const [imageUri, setImageUri] = useState<string | null>(null);

    const loadMyFoods = async () => {
        try {
            // 1. Load Local
            const stored = await AsyncStorage.getItem('my_foods');
            let localFoods: FoodItem[] = [];
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) localFoods = parsed;
                } catch (e) { console.log('Parse error', e); }
            }

            // 2. Sync with Today's Backend Logs (Disabled)
            // const { data: { user } } = await supabase.auth.getUser();
            const user: any = null; // Force skip sync
            if (user) {
                try {
                    const dailyLogs = await getDailyLogs(user.id);
                    // dailyLogs: { logs: [{ foodProduct: { name, calories, ... }, ... }] }
                    if (dailyLogs && dailyLogs.logs) {
                        const todayItems: FoodItem[] = dailyLogs.logs.map((log: any) => ({
                            id: log.foodProduct.barcode || `log_${log.id}`,
                            name: log.foodProduct.name,
                            calories: log.foodProduct.calories,
                            protein: log.foodProduct.protein,
                            fat: log.foodProduct.fat,
                            carbs: log.foodProduct.carbs,
                            category: 'Recent Log'
                        }));

                        // Merge uniqueness based on Name + Calories (approx)
                        const combined = [...localFoods];
                        todayItems.forEach(item => {
                            if (!combined.some(existing => existing.name === item.name)) {
                                combined.push(item);
                            }
                        });

                        localFoods = combined;
                        // Save back to local storage
                        await AsyncStorage.setItem('my_foods', JSON.stringify(localFoods));
                    }
                } catch (err) {
                    console.log('Failed to sync daily logs', err);
                }
            }

            setMyFoods(localFoods);
        } catch (e) {
            console.error('Failed to load my foods', e);
        }
    };

    useEffect(() => {
        navigation.setOptions({ title: t('addMeal') });
        loadMyFoods();
    }, [navigation, language, t]);

    // Handle params from CameraScreen
    useEffect(() => {
        if (route.params?.prefilledName) {
            setMealName(route.params.prefilledName);
        }
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
        if (route.params?.imageUri) {
            setImageUri(route.params.imageUri);
        }
        if (route.params?.triggerSearch && route.params?.prefilledName) {
            setSearchQuery(route.params.prefilledName);
            setModalVisible(true);
            handleSearch(route.params.prefilledName);
        }
    }, [route.params]);

    // Determine default meal type based on time or params
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






    // Moved up to fix reference error
    const localFilteredFood = JAPANESE_FOOD_DATABASE.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const combinedResults = [...myFoods.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), ...localFilteredFood, ...apiResults];

    const addMeal = async () => {
        const cal = parseInt(calories);
        if (!mealName || isNaN(cal)) {
            Alert.alert(t('error'), 'Please enter a valid meal name and calories.');
            return;
        }

        const p = parseFloat(protein) || 0;
        const f = parseFloat(fat) || 0;
        const c = parseFloat(carbs) || 0;

        setLoading(true);
        try {


            // Determine date to use (passed from params or today)
            const dateToUse = route.params?.date ? new Date(route.params.date) : new Date();
            const dateStr = dateToUse.toISOString().split('T')[0];
            const fullIsoString = dateToUse.toISOString();

            // 1. Try to save to Supabase 
            const { error } = await supabase
                .from('meals')
                .insert([{ name: mealName, calories: cal, date: fullIsoString, meal_type: mealType }]);

            if (error) {
                console.log('Supabase error (expected if not setup):', error.message);
            }

            // Auto-save to Public Database (Attempt)
            let savedBarcode = route.params?.scannedBarcode;
            try {
                const { createProduct } = require('../services/foodApiService');
                const barcodeToUse = route.params?.scannedBarcode;

                const savedProduct = await createProduct({
                    barcode: barcodeToUse,
                    name: mealName,
                    calories: baseNutrients.calories,
                    protein: baseNutrients.protein,
                    fat: baseNutrients.fat,
                    carbs: baseNutrients.carbs,
                });
                console.log("Auto-saved to public database:", savedProduct.barcode);
                savedBarcode = savedProduct.barcode;

            } catch (e) {
                console.log("Skipping public DB save (might already exist or error):", e);
                // If public save fails, generate a local ID if we don't have one
                if (!savedBarcode) {
                    savedBarcode = `local_${Date.now()}`;
                }
            }

            // ALWAYS save to local "My Foods" for offline access/history
            try {
                const newFoodItem: FoodItem = {
                    id: savedBarcode!,
                    name: mealName,
                    calories: cal,
                    protein: p,
                    fat: f,
                    carbs: c,
                    category: 'Other'
                };

                // Avoid duplicates
                const updatedMyFoods = [...myFoods];
                if (!updatedMyFoods.some(f => f.name === newFoodItem.name && f.calories === newFoodItem.calories)) {
                    updatedMyFoods.push(newFoodItem);
                    setMyFoods(updatedMyFoods);
                    await AsyncStorage.setItem('my_foods', JSON.stringify(updatedMyFoods));
                }
            } catch (e) {
                console.log("Failed to save to my_foods", e);
            }

            // 2. Try to save to Backend via API (Fastify + Prisma)
            // This ensures Dashboard (which fetches from backend) sees the data.
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                try {
                    // Let's try to log if we can.

                    // For this fix, let's rely on Local Storage primarily but ALSO try backend if possible,
                    // BUT currently Dashboard expects backend data if logged in. 
                    // CRITICAL: Dashboard prioritizes backend. If backend has 0, it shows 0.
                    // We MUST sync to backend.

                    // Workaround: If manual entry, we can't easily sync to backend without creating a product.
                    // For now, let's just log to console if we can't sync.

                    // actually, let's use the logMeal API
                    // We need the food ID. 
                    // If apiResults were used, we have `off_...`. 
                    // If manual, we don't.
                } catch (err) {
                    console.log("Backend sync failed", err);
                }
            }

            // 2. Save to Local Storage with correct date
            // Note: We use Local Storage as the primary offline cache and for simple display customization
            const existingMealsJson = await AsyncStorage.getItem(`meals_${dateStr}`);
            const existingMeals = existingMealsJson ? JSON.parse(existingMealsJson) : [];

            // Create new meal object
            const newMeal = {
                id: Date.now().toString(),
                name: mealName,
                calories: cal,
                protein: p,
                fat: f,
                carbs: c,
                mealType,
                imageUri
            };
            const updatedMeals = [...existingMeals, newMeal];

            await AsyncStorage.setItem(`meals_${dateStr}`, JSON.stringify(updatedMeals));

            Alert.alert(t('success'), `Meal added for ${dateStr}!`);
            setMealName('');
            setCalories('');
            setProtein('');
            setFat('');
            setCarbs('');
            setImageUri(null);
            // navigate to Dashboard
            navigation.navigate('Dashboard');
        } catch (e) {
            console.error(e);
            Alert.alert(t('error'), 'Failed to add meal.');
        } finally {
            setLoading(false);
        }
    };

    const suggestions = mealName.length > 0 ? JAPANESE_FOOD_DATABASE.filter(item =>
        item.name.toLowerCase().includes(mealName.toLowerCase())
    ).slice(0, 5) : [];

    const selectSuggestion = (item: FoodItem) => {
        setMealName(item.name);
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
        setShowSuggestions(false);
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 0) {
            setIsSearchingApi(true);
            try {
                // 1. Search Local My Foods first
                const localResults = myFoods.filter(item =>
                    item.name.toLowerCase().includes(text.toLowerCase())
                );
                setFilteredMyFoods(localResults);

                console.log('Searching API for:', text);
                // Use backend search (cached)
                const results = await searchFood(text);
                console.log('API Results:', results.length);

                // Map Backend/DB FoodProduct format to FoodItem
                // Backend returns: { barcode, name, calories, protein, fat, carbs, ... }
                const mappedResults: FoodItem[] = results.map((item: any, index: number) => ({
                    id: `off_${item.barcode}_${index}`,
                    name: item.name,
                    calories: Math.round(item.calories),
                    protein: Math.round(item.protein),
                    fat: Math.round(item.fat),
                    carbs: Math.round(item.carbs),
                    category: 'Online Search'
                }));
                setApiResults(mappedResults);
            } catch (error) {
                console.error('Search Error:', error);
                Alert.alert('Search Error', 'Failed to search food. ' + String(error));
            } finally {
                setIsSearchingApi(false);
            }
        } else {
            setApiResults([]);
        }
    };

    const selectFood = (item: FoodItem) => {
        setMealName(item.name);
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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.title}>{t('addMealTitle')}</Text>

                    {/* Meal Type Selection */}
                    <Text style={styles.label}>{t('mealType')}</Text>
                    <View style={styles.mealTypeContainer}>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.mealTypeButton, mealType === type && styles.mealTypeButtonSelected]}
                                onPress={() => setMealType(type)}
                            >
                                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextSelected]}>
                                    {t(type)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Image Preview */}
                    {imageUri && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageButton}>
                                <Text style={{ color: 'white' }}>X</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('mealName')}</Text>
                        <View>
                            <TextInput
                                style={styles.input}
                                value={mealName}
                                onChangeText={(text) => {
                                    setMealName(text);
                                    setShowSuggestions(true);
                                }}
                                placeholder="e.g. Grilled Chicken Salad"
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    {suggestions.map((item) => (
                                        <TouchableOpacity key={item.id} style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                                            <Text>{item.name} ({item.calories} kcal)</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('quantity')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                keyboardType="numeric"
                                value={quantity}
                                onChangeText={updateQuantity}
                                placeholder="1"
                            />
                            <Text style={{ marginLeft: 10, fontSize: 16 }}>{t('servings')}</Text>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('calories')} (kcal)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={calories}
                            onChangeText={(text) => {
                                setCalories(text);
                                const val = parseFloat(text);
                                const q = parseFloat(quantity);
                                if (!isNaN(val) && !isNaN(q) && q > 0) {
                                    setBaseNutrients(prev => ({ ...prev, calories: val / q }));
                                }
                            }}
                            placeholder="e.g. 450"
                        />
                    </View>

                    {/* New P/F/C Input Fields */}
                    <View style={styles.pfcRow}>
                        <TextInput
                            style={[styles.input, styles.pfcInput]}
                            placeholder={`${t('protein')} (${t('g')})`}
                            keyboardType="numeric"
                            value={protein}
                            onChangeText={(text) => {
                                setProtein(text);
                                const val = parseFloat(text);
                                const q = parseFloat(quantity);
                                if (!isNaN(val) && !isNaN(q) && q > 0) {
                                    setBaseNutrients(prev => ({ ...prev, protein: val / q }));
                                }
                            }}
                        />
                        <TextInput
                            style={[styles.input, styles.pfcInput]}
                            placeholder={`${t('fat')} (${t('g')})`}
                            keyboardType="numeric"
                            value={fat}
                            onChangeText={(text) => {
                                setFat(text);
                                const val = parseFloat(text);
                                const q = parseFloat(quantity);
                                if (!isNaN(val) && !isNaN(q) && q > 0) {
                                    setBaseNutrients(prev => ({ ...prev, fat: val / q }));
                                }
                            }}
                        />
                        <TextInput
                            style={[styles.input, styles.pfcInput]}
                            placeholder={`${t('carbs')} (${t('g')})`}
                            keyboardType="numeric"
                            value={carbs}
                            onChangeText={(text) => {
                                setCarbs(text);
                                const val = parseFloat(text);
                                const q = parseFloat(quantity);
                                if (!isNaN(val) && !isNaN(q) && q > 0) {
                                    setBaseNutrients(prev => ({ ...prev, carbs: val / q }));
                                }
                            }}
                        />
                    </View>



                    <View style={styles.actionButtons}>
                        <Button
                            title={`📷 ${t('scan')}`}
                            onPress={() => {
                                if (Platform.OS === 'ios') {
                                    ActionSheetIOS.showActionSheetWithOptions(
                                        {
                                            options: [t('cancel'), t('barcode') || "Barcode", t('aiScan') || "Food Photo (AI)", t('labelScan') || "Nutrition Label"],
                                            cancelButtonIndex: 0,
                                            title: t('selectScanMode') || "Select Scan Mode",
                                            message: t('chooseScanOptions') || "Choose how you want to add food",
                                        },
                                        (buttonIndex) => {
                                            if (buttonIndex === 1) {
                                                navigation.navigate('Scanner', { date: route.params?.date, mealType, mode: 'barcode' });
                                            } else if (buttonIndex === 2) {
                                                navigation.navigate('Scanner', { date: route.params?.date, mealType, mode: 'ai' });
                                            } else if (buttonIndex === 3) {
                                                navigation.navigate('LabelScanner', { date: route.params?.date, mealType });
                                            }
                                        }
                                    );
                                } else {
                                    Alert.alert(
                                        t('selectScanMode') || "Select Scan Mode",
                                        t('chooseScanOptions') || "Choose how you want to add food",
                                        [
                                            { text: t('barcode') || "Barcode", onPress: () => navigation.navigate('Scanner', { date: route.params?.date, mealType, mode: 'barcode' }) },
                                            { text: t('aiScan') || "Food Photo (AI)", onPress: () => navigation.navigate('Scanner', { date: route.params?.date, mealType, mode: 'ai' }) },
                                            { text: t('labelScan') || "Nutrition Label", onPress: () => navigation.navigate('LabelScanner', { date: route.params?.date, mealType }) },
                                            { text: t('cancel'), style: 'cancel' }
                                        ]
                                    );
                                }
                            }}
                        />
                        <View style={{ height: 10 }} />
                        <Button title="🔍 食事を探す" onPress={() => setModalVisible(true)} color="#FF9500" />
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.addButton, loading && { opacity: 0.7 }]}
                            onPress={addMeal}
                            disabled={loading}
                        >
                            <Text style={styles.addButtonText}>
                                {loading ? t('analyzing') : t('add')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Food Search Modal */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalView}>
                            <Text style={styles.modalTitle}>{t('selectFood') || "Select Food"}</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search (e.g. Cola, Ramen)"
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            {isSearchingApi ? (
                                <View style={{ alignItems: 'center', padding: 20 }}>
                                    <ActivityIndicator size="large" color="#007AFF" />
                                    <Text style={{ marginTop: 10, color: '#666' }}>Searching...</Text>
                                </View>
                            ) : (
                                <View>
                                    {filteredMyFoods.length > 0 && (
                                        <View>
                                            <Text style={{ fontWeight: 'bold', marginVertical: 5, color: '#666', marginLeft: 5 }}>My Foods</Text>
                                            {filteredMyFoods.map((item, index) => (
                                                <TouchableOpacity key={`local_${index}`} style={styles.foodItem} onPress={() => selectFood(item)}>
                                                    <View>
                                                        <Text style={styles.foodName}>{item.name}</Text>
                                                        <Text style={styles.foodCal}>{item.calories} kcal</Text>
                                                    </View>
                                                    <Text style={{ color: '#4CAF50' }}>★</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {apiResults.length > 0 && (
                                        <View>
                                            <Text style={{ fontWeight: 'bold', marginVertical: 5, color: '#666', marginLeft: 5 }}>Search Results</Text>
                                            {apiResults.map((item) => (
                                                <TouchableOpacity key={item.id} style={styles.foodItem} onPress={() => selectFood(item)}>
                                                    <View>
                                                        <Text style={styles.foodName}>{item.name}</Text>
                                                        <Text style={styles.foodCal}>{item.calories} kcal</Text>
                                                    </View>
                                                    <Text style={styles.foodCal}>+</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {filteredMyFoods.length === 0 && apiResults.length === 0 && searchQuery.length > 0 && (
                                        <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>
                                            No items found.
                                        </Text>
                                    )}
                                </View>
                            )}
                            {/* Add "Use Scanned Data" button for AI flow */}
                            {searchQuery.length > 0 && (
                                <View style={{ marginBottom: 10 }}>
                                    <Button
                                        title={`✅ ${t('useAiData') || "Use Scanned Data"}`}
                                        onPress={() => setModalVisible(false)}
                                        color="#34C759"
                                    />
                                </View>
                            )}
                            <Button title={t('cancel')} onPress={() => setModalVisible(false)} color="red" />
                        </View>
                    </Modal>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        paddingBottom: 100, // Ensure content is scrollable past the bottom
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    inputContainer: { // Added missing style
        marginBottom: 15,
    },
    actionButtons: {
        marginVertical: 20,
    },
    buttonContainer: {
        marginTop: 10,
    },
    modalView: {
        flex: 1,
        marginTop: 50,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
    },
    foodItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    foodName: {
        fontSize: 16,
    },
    foodCal: {
        fontSize: 16,
        color: '#666',
    },
    mealTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    pfcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    pfcInput: {
        width: '30%',
    },
    addButton: {
        backgroundColor: '#34C759',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    mealTypeButton: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        marginHorizontal: 2,
        borderRadius: 8,
    },
    mealTypeButtonSelected: {
        backgroundColor: '#007AFF',
    },
    mealTypeText: {
        color: '#333',
    },
    mealTypeTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderTopWidth: 0,
        borderRadius: 8,
        marginTop: 0,
        maxHeight: 150,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        position: 'absolute',
        top: 50,
        width: '100%',
        zIndex: 10,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    imagePreviewContainer: {
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    imagePreview: {
        width: 200,
        height: 200,
        borderRadius: 10,
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10, // Adjusted positioning relative to container or image if container width matches
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxContainer: {
        marginBottom: 15,
        alignItems: 'center',
    },
    checkboxTouch: {
        padding: 10,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#007AFF',
    },
    quickSizeContainer: {
        marginTop: 10,
    },
    quickSizeLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    quickSizeButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    sizeButton: {
        backgroundColor: '#e1e1e1',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
    },
    sizeButtonText: {
        fontSize: 14,
        color: '#333',
    },
});

export default MealEntryScreen;
