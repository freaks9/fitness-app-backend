import { Camera, ChevronRight, Edit3, History, Search } from 'lucide-react-native';
import React from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const AddMealMenuScreen = ({ navigation, route }: any) => {
    const { t } = useLanguageContext();
    const { mealHistory, addMeal } = useUser();
    const { date, mealType } = route.params || {};

    const menuOptions = [
        {
            id: 'ai',
            title: t('aiScan') || 'AIスキャン',
            subtitle: 'カメラで料理を解析',
            icon: Camera,
            color: '#1E88E5',
            onPress: () => navigation.navigate('Scanner', { date, mealType, mode: 'ai' })
        },
        {
            id: 'search',
            title: t('searchDatabase') || 'データベース検索',
            subtitle: 'キーワードで検索して登録',
            icon: Search,
            color: '#43A047',
            onPress: () => navigation.navigate('MealEntry', { date, mealType, triggerSearch: true })
        },
        {
            id: 'manual',
            title: t('manualEntry') || '手動で入力',
            subtitle: '自分で内容を入力して登録',
            icon: Edit3,
            color: '#FB8C00',
            onPress: () => navigation.navigate('MealEntry', { date, mealType })
        },
        {
            id: 'history',
            title: t('historySelect') || '履歴から選択',
            subtitle: '過去の食事から選ぶ',
            icon: History,
            color: '#8E24AA',
            onPress: () => { /* This is mainly for information since history is listed below */ }
        }
    ];

    const handleQuickRegister = async (item: any) => {
        Alert.alert(
            'クイック登録',
            `${item.name} を登録しますか？`,
            [
                { text: t('cancel') || 'キャンセル', style: 'cancel' },
                {
                    text: t('add') || '登録',
                    onPress: async () => {
                        const newMeal = {
                            ...item,
                            id: Date.now().toString(),
                            // Ensure numeric values and barcode for sync
                            barcode: item.barcode || item.id,
                            calories: parseFloat(item.calories) || 0,
                            protein: parseFloat(item.protein) || 0,
                            fat: parseFloat(item.fat) || 0,
                            carbs: parseFloat(item.carbs) || 0,
                            date: date || new Date().toISOString().split('T')[0],
                            mealType: mealType || item.mealType
                        };
                        await addMeal(newMeal);
                        navigation.popToTop();
                    }
                }
            ]
        );
    };

    const renderMenuButton = (item: any) => {
        const Icon = item.icon;
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.menuButton}
                onPress={item.onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.iconWrapper, { backgroundColor: item.color + '15' }]}>
                    <Icon color={item.color} size={28} />
                </View>
                <View style={styles.menuTextContent}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight color="#CBD5E1" size={20} />
            </TouchableOpacity>
        );
    };

    const renderHistoryItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.historyItem}
            onPress={() => handleQuickRegister(item)}
            activeOpacity={0.6}
        >
            <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{item.name}</Text>
                <Text style={styles.historyDetails}>
                    {item.calories} kcal • {item.date}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.quickAddBtn}
                onPress={() => handleQuickRegister(item)}
            >
                <Text style={styles.quickAddText}>追加</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t(mealType) || '食事'}を登録</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.closeBtn}>{t('cancel') || 'キャンセル'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    {menuOptions.map(renderMenuButton)}
                </View>

                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>最近の履歴</Text>
                        <Text style={styles.sectionSubtitle}>タップしてクイック登録</Text>
                    </View>

                    {mealHistory.length > 0 ? (
                        <FlatList
                            data={mealHistory}
                            renderItem={renderHistoryItem}
                            keyExtractor={(item, index) => item.id || index.toString()}
                            contentContainerStyle={styles.historyList}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyHistory}>
                            <Text style={styles.emptyText}>履歴がまだありません</Text>
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
    container: { flex: 1, padding: 20 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
    closeBtn: { color: '#64748B', fontSize: 16 },
    menuSection: { marginBottom: 30 },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContent: { flex: 1 },
    menuTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
    menuSubtitle: { fontSize: 13, color: '#64748B' },
    historySection: { flex: 1 },
    sectionHeader: { marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
    sectionSubtitle: { fontSize: 12, color: '#94A3B8' },
    historyList: { paddingBottom: 20 },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    historyInfo: { flex: 1 },
    historyName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
    historyDetails: { fontSize: 12, color: '#64748B' },
    quickAddBtn: {
        backgroundColor: '#1E88E5' + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    quickAddText: { color: '#1E88E5', fontWeight: 'bold', fontSize: 13 },
    emptyHistory: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50
    },
    emptyText: { color: '#94A3B8', fontSize: 14 },
});

export default AddMealMenuScreen;
