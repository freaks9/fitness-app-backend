
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { EXERCISE_DATABASE, ExerciseItem } from '../data/exercises';
import { ApiExerciseItem, searchExampleExercisesItems } from '../services/apiNinjasService';
import { calculateBurnedCalories, saveExerciseLog } from '../services/exerciseService';

const ExerciseEntryScreen = ({ navigation, route }: any) => {
    const { t } = useLanguageContext();
    const [mode, setMode] = useState<'search' | 'manual'>('search');

    // Search Mode State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ExerciseItem[]>(EXERCISE_DATABASE);
    const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
    const [duration, setDuration] = useState(30);
    const [weight, setWeight] = useState(60);

    // Manual Mode State
    const [manualName, setManualName] = useState('');
    const [manualCalories, setManualCalories] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [apiResults, setApiResults] = useState<ApiExerciseItem[]>([]);

    useEffect(() => {
        navigation.setOptions({ title: t('addExercise') });

        const loadUserWeight = async () => {
            try {
                const savedSettings = await AsyncStorage.getItem('userSettings');
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.weight) {
                        setWeight(parseFloat(parsed.weight));
                    }
                }
            } catch (e) {
                console.error('Failed to load weight', e);
            }
        };

        loadUserWeight();
    }, [navigation, t]);

    // Filter Local DB
    useEffect(() => {
        if (searchQuery) {
            const filtered = EXERCISE_DATABASE.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(filtered);
        } else {
            setSearchResults(EXERCISE_DATABASE);
        }
    }, [searchQuery]);

    // Handle Search API
    const handleApiSearch = async () => {
        if (!searchQuery) return;
        // Convert kg to lb for API (approx)
        // const weightLb = weight * 2.20462;
        // For now using mock/example, replace with fetchCaloriesBurnedFromApi(searchQuery, weightLb) if key exists
        const results = await searchExampleExercisesItems(searchQuery, weight);
        // const results = await fetchCaloriesBurnedFromApi(searchQuery, weightLb);
        setApiResults(results);
    };

    const handleSave = async () => {
        let name = '';
        let calories = 0;
        let durationMin = duration;

        if (mode === 'search') {
            if (!selectedExercise) {
                Alert.alert(t('error'), t('selectExercise'));
                return;
            }
            name = selectedExercise.name;
            calories = calculateBurnedCalories(selectedExercise.mets, weight, duration);
        } else {
            if (!manualName || !manualCalories) {
                Alert.alert(t('error'), t('invalidInput'));
                return;
            }
            name = manualName;
            calories = parseInt(manualCalories);
            durationMin = 0; // Or ask user
        }

        const dateToUse = route.params?.date ? route.params.date : new Date().toISOString().split('T')[0];

        const newLog = {
            id: Date.now().toString(),
            exerciseId: mode === 'search' ? selectedExercise?.id || 'manual' : 'manual',
            name: name,
            durationMinutes: durationMin,
            caloriesBurned: calories,
            date: dateToUse,
            timestamp: Date.now()
        };

        await saveExerciseLog(newLog);
        const msg = t('burnedKcal') ? t('burnedKcal').replace('{{calories}}', String(calories)) : `${calories} kcal burned!`;
        Alert.alert(t('success') || 'Success', msg);
        navigation.goBack();
    };

    // Selecting from API result transforms it into a "local" exercise item temporarily
    const selectApiItem = (apiItem: ApiExerciseItem) => {
        // Reverse calculate METs or just use the calories provided?
        // METs = (kcal / (weight * (time/60) * 1.05))
        // But simpler to just use the calorie value directly if we switch mode, 
        // OR construct a temp ExerciseItem with approx METs.

        // Let's approximate METs for the slider to work
        // METs = (apiItem.calories_per_hour / weight) / 1.05 approx
        const estimatedMets = (apiItem.calories_per_hour / weight) / 1.05;

        const tempItem: ExerciseItem = {
            id: `api_${apiItem.name}`,
            name: apiItem.name,
            mets: parseFloat(estimatedMets.toFixed(1)),
            category: 'Cardio'
        };
        setSelectedExercise(tempItem);
        setModalVisible(false);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Mode Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, mode === 'search' && styles.activeTab]}
                    onPress={() => setMode('search')}
                >
                    <Text style={[styles.tabText, mode === 'search' && styles.activeTabText]}>{t('searchExercise')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, mode === 'manual' && styles.activeTab]}
                    onPress={() => setMode('manual')}
                >
                    <Text style={[styles.tabText, mode === 'manual' && styles.activeTabText]}>{t('manualEntry') || 'Manual Input'}</Text>
                </TouchableOpacity>
            </View>

            {mode === 'search' ? (
                <>
                    <Text style={styles.label}>{t('exerciseName')}</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setModalVisible(true)}>
                        <Text style={styles.selectorText}>
                            {selectedExercise ? selectedExercise.name : t('selectExercise')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>{t('durationMin')}: {duration} min</Text>
                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={5}
                        maximumValue={180}
                        step={5}
                        value={duration}
                        onValueChange={setDuration}
                        minimumTrackTintColor="#007AFF"
                        maximumTrackTintColor="#000000"
                    />

                    {selectedExercise && (
                        <View style={styles.previewContainer}>
                            <Text style={styles.previewLabel}>{t('burnedCal')}</Text>
                            <Text style={styles.previewValue}>
                                ~ {calculateBurnedCalories(selectedExercise.mets, weight, duration)} kcal
                            </Text>
                            <Text style={styles.itemSubText}>(METs: {selectedExercise.mets})</Text>
                        </View>
                    )}
                </>
            ) : (
                <>
                    <Text style={styles.label}>{t('exerciseName')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Hiking"
                        value={manualName}
                        onChangeText={setManualName}
                    />

                    <Text style={styles.label}>{t('burnedCal')} (kcal)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 300"
                        keyboardType="numeric"
                        value={manualCalories}
                        onChangeText={setManualCalories}
                    />
                </>
            )}

            <View style={styles.buttonContainer}>
                <Button
                    title={t('saveExercise')}
                    onPress={handleSave}
                    disabled={mode === 'search' && !selectedExercise}
                />
            </View>

            {/* Search Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{t('searchExercise')}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder="Search..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <Button title="Online Fit" onPress={handleApiSearch} />
                    </View>

                    {apiResults.length > 0 && (
                        <View style={styles.apiResultsContainer}>
                            <Text style={styles.sectionHeader}>{t('onlineResults') || 'Online Results:'}</Text>
                            {apiResults.map((item, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.apiItem}
                                    onPress={() => selectApiItem(item)}
                                >
                                    <Text style={styles.itemText}>{item.name}</Text>
                                    <Text style={styles.itemSubText}>{item.calories_per_hour} kcal/hr</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <Text style={styles.sectionHeader}>{t('localDatabase') || 'Local Database:'}</Text>
                    <FlatList
                        data={searchResults}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => {
                                    setSelectedExercise(item);
                                    setModalVisible(false);
                                }}
                            >
                                <Text style={styles.itemText}>{item.name} ({item.category})</Text>
                                <Text style={styles.itemSubText}>METs: {item.mets}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>{t('noExerciseFound')}</Text>}
                    />
                    <Button title={t('close')} onPress={() => setModalVisible(false)} color="red" />
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10,
    },
    selector: {
        padding: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        marginBottom: 20,
    },
    selectorText: {
        fontSize: 16,
    },
    previewContainer: {
        marginTop: 30,
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#e0f7fa',
        borderRadius: 10,
    },
    previewLabel: {
        fontSize: 14,
        color: '#006064',
    },
    previewValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#006064',
    },
    buttonContainer: {
        marginTop: 40,
        marginBottom: 40,
    },
    modalView: {
        flex: 1,
        marginTop: 50,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    item: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    apiItem: {
        padding: 10,
        backgroundColor: '#f0f8ff',
        marginBottom: 5,
        borderRadius: 5,
    },
    itemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    itemSubText: {
        fontSize: 14,
        color: '#666',
    },
    apiResultsContainer: {
        maxHeight: 150,
        marginBottom: 10,
    },
    sectionHeader: {
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#333',
    },
});

export default ExerciseEntryScreen;
