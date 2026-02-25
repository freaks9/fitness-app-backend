
import { ChefHat, Microscope, Plus, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDietMethodColor, getDietMethodLabel } from '../constants/dietMethods';
import { useUser } from '../context/UserContext';
import { SavedMenu } from '../types/savedMenu';

const MyMenuScreen = ({ navigation }: any) => {
    // const { t } = useLanguageContext(); // Removed unused
    const { savedMenus, unsaveMenu, addMeal } = useUser();

    const handleEatMenu = async (savedMenu: SavedMenu) => {
        if (!savedMenu.lab_reports) return;
        const report = savedMenu.lab_reports;

        Alert.alert(
            'このメニューを食べる',
            `${report.dish_name} を本日の食事に追加しますか？`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '追加する',
                    onPress: async () => {
                        const newMeal = {
                            id: Date.now().toString(),
                            name: report.dish_name,
                            mealName: report.dish_name,
                            calories: report.nutrients.calories,
                            protein: report.nutrients.protein,
                            fat: report.nutrients.fat,
                            carbs: report.nutrients.carbs,
                            date: new Date().toISOString().split('T')[0],
                            mealType: 'Lunch', // Default to lunch or could ask user
                            imageUri: report.image_url,
                            nutrientsDetail: report.nutrients.details
                        };
                        await addMeal(newMeal);
                        Alert.alert('追加完了', '食事記録に追加しました！');
                        navigation.navigate('Main'); // Go to Dashboard
                    }
                }
            ]
        );
    };

    const renderSavedItem = ({ item }: { item: SavedMenu }) => {
        const report = item.lab_reports;
        if (!report) return null;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <Microscope size={16} color="#1E88E5" />
                        <Text style={styles.dishName}>{report.dish_name}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                '保存を解除',
                                'このメニューをマイメニューから削除しますか？',
                                [
                                    { text: 'キャンセル', style: 'cancel' },
                                    { text: '削除', style: 'destructive', onPress: () => unsaveMenu(report.id) }
                                ]
                            );
                        }}
                    >
                        <Trash2 size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {report.image_url && (
                    <Image source={{ uri: report.image_url }} style={styles.foodImage} />
                )}

                <View style={styles.statsRow}>
                    <View style={styles.calorieBadge}>
                        <Text style={styles.calorieText}>{report.nutrients.calories} kcal</Text>
                    </View>
                    <View style={styles.pfcContainer}>
                        <Text style={styles.pfcText}>P: {report.nutrients.protein}g</Text>
                        <Text style={styles.pfcText}>F: {report.nutrients.fat}g</Text>
                        <Text style={styles.pfcText}>C: {report.nutrients.carbs}g</Text>
                    </View>
                </View>

                <View style={styles.methodRow}>
                    <View style={[styles.methodBadge, { backgroundColor: getDietMethodColor(report.method_tag || 'other') + '20' }]}>
                        <Text style={[styles.methodText, { color: getDietMethodColor(report.method_tag || 'other') }]}>
                            {getDietMethodLabel(report.method_tag || 'other')}
                        </Text>
                    </View>
                    {report.is_recommended && (
                        <View style={styles.recommendedBadge}>
                            <Star size={10} color="#B45309" fill="#B45309" style={{ marginRight: 2 }} />
                            <Text style={styles.recommendedText}>おすすめ</Text>
                        </View>
                    )}
                </View>

                {report.comment && (
                    <Text style={styles.commentText} numberOfLines={2}>{report.comment}</Text>
                )}

                <TouchableOpacity
                    style={styles.eatButton}
                    onPress={() => handleEatMenu(item)}
                >
                    <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.eatButtonText}>このメニューを食べる</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>マイメニュー</Text>
                <Text style={styles.subtitle}>Saved Research & Favorites</Text>
            </View>

            <View style={styles.sectionHeader}>
                <ChefHat size={20} color="#1E88E5" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>保存した研究報告</Text>
            </View>

            {savedMenus.length > 0 ? (
                <FlatList
                    data={savedMenus}
                    renderItem={renderSavedItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>保存されたメニューはありません</Text>
                    <Text style={styles.emptySubText}>ダイエットラボから気に入った研究を保存しましょう</Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 20, backgroundColor: '#F8FAFC' },
    title: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
    subtitle: { fontSize: 13, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    dishName: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1 },
    foodImage: { width: '100%', height: 140, borderRadius: 12, marginBottom: 12 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    calorieBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    calorieText: { fontSize: 13, fontWeight: '800', color: '#334155' },
    pfcContainer: { flexDirection: 'row', gap: 8 },
    pfcText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    methodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    methodText: { fontSize: 11, fontWeight: '700' },
    recommendedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    recommendedText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
    commentText: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 16 },
    eatButton: { backgroundColor: '#1E88E5', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
    eatButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    emptySubText: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
});

export default MyMenuScreen;
