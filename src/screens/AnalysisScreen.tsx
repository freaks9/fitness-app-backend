import { BarChart2, Info, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const screenWidth = Dimensions.get('window').width;

const AnalysisScreen = () => {
    const { todaysMeals, profile } = useUser();
    const { t } = useLanguageContext();

    // Calculate daily totals with expanded logic
    const analysisData = useMemo(() => {
        // Move nutrientLabels and targets inside to avoid dependency issues
        const nutrientLabels = [
            t('calories'), t('protein'), t('fat'), t('carbs'), 'Fiber',
            'VitA', 'VitB1', 'VitB2', 'VitC', 'VitD',
            'Calcium', 'Iron', 'Zinc', t('saltSodium')
        ];

        const targets = {
            energy: profile.goal || 2000,
            protein: profile.pfcGoals?.protein || 100,
            fat: profile.pfcGoals?.fat || 60,
            carbs: profile.pfcGoals?.carbs || 250,
            fiber: 20,
            vitA: 800,
            vitB1: 1.2,
            vitB2: 1.4,
            vitC: 100,
            vitD: 8.5,
            calcium: 800,
            iron: 10,
            zinc: 10,
            salt: 7.0
        };

        const calculateTotal = (key: string) => {
            return todaysMeals.reduce((sum, m) => sum + (parseFloat(m[key]) || 0), 0);
        };

        const totals = {
            energy: calculateTotal('calories'),
            protein: calculateTotal('protein'),
            fat: calculateTotal('fat'),
            carbs: calculateTotal('carbs'),
            fiber: calculateTotal('fiber') || (calculateTotal('calories') * 0.01), // mock if absent
            vitA: calculateTotal('vitA') || 300,
            vitB1: calculateTotal('vitB1') || 0.5,
            vitB2: calculateTotal('vitB2') || 0.7,
            vitC: calculateTotal('vitC') || (todaysMeals.length > 0 ? 45 : 0), // Improved Vitamin C mock logic
            vitD: calculateTotal('vitD') || 2.5,
            calcium: calculateTotal('calcium') || 400,
            iron: calculateTotal('iron') || 6,
            zinc: calculateTotal('zinc') || 4,
            salt: calculateTotal('salt') || (todaysMeals.length > 0 ? 5.2 : 0) // Improved Salt mock logic
        };

        return {
            labels: nutrientLabels,
            datasets: [{
                data: [
                    Math.round((totals.energy / targets.energy) * 100),
                    Math.round((totals.protein / targets.protein) * 100),
                    Math.round((totals.fat / targets.fat) * 100),
                    Math.round((totals.carbs / targets.carbs) * 100),
                    Math.round((totals.fiber / targets.fiber) * 100),
                    Math.round((totals.vitA / targets.vitA) * 100),
                    Math.round((totals.vitB1 / targets.vitB1) * 100),
                    Math.round((totals.vitB2 / targets.vitB2) * 100),
                    Math.round((totals.vitC / targets.vitC) * 100),
                    Math.round((totals.vitD / targets.vitD) * 100),
                    Math.round((totals.calcium / targets.calcium) * 100),
                    Math.round((totals.iron / targets.iron) * 100),
                    Math.round((totals.zinc / targets.zinc) * 100),
                    Math.round((totals.salt / targets.salt) * 100)
                ]
            }],
            totals,
            targets // Also return targets for other components
        };
    }, [todaysMeals, profile, t]);

    // Update charts and advice to use targets from analysisData
    const targets = analysisData.targets;

    const chartConfig = {
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
        style: { borderRadius: 16 },
        propsForLabels: { fontSize: 10, fontWeight: '600' }
    };

    // Dynamic Advice Logic
    const advice = useMemo(() => {
        if (todaysMeals.length === 0) return t('noDataRecorded');

        let msgs = [];
        if (analysisData.totals.salt > targets.salt) msgs.push(t('saltAdvice'));
        if (analysisData.totals.vitC < targets.vitC * 0.5) msgs.push(t('vitCAdvice'));
        if (analysisData.totals.protein < targets.protein * 0.8) msgs.push(t('proteinAdvice'));

        return msgs.length > 0 ? msgs.join(' ') : t('perfectBalanceAdvice');
    }, [analysisData.totals, targets, todaysMeals.length, t]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <BarChart2 size={32} color="#1E88E5" />
                    <Text style={styles.title}>{t('precisionAnalysis')}</Text>
                </View>

                {/* 14 Nutrient Balance Chart */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Info size={18} color="#1E88E5" />
                        <Text style={styles.cardTitle}>{t('detailedNutrientBalance')}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ paddingRight: 20 }}>
                            <BarChart
                                data={analysisData}
                                width={screenWidth * 1.8}
                                height={280}
                                yAxisLabel=""
                                yAxisSuffix="%"
                                chartConfig={chartConfig}
                                verticalLabelRotation={35}
                                fromZero
                                style={{ marginVertical: 8, borderRadius: 16 }}
                                showValuesOnTopOfBars
                            />
                        </View>
                    </ScrollView>
                    <Text style={styles.legendText}>{t('chartDisclaimer')}</Text>
                </View>

                {/* Salt & VitC Focus Boxes */}
                <View style={styles.focusRow}>
                    <View style={[styles.focusBox, { borderColor: analysisData.totals.salt > targets.salt ? '#EF4444' : '#10B981' }]}>
                        <Text style={styles.focusLabel}>{t('saltSodium')}</Text>
                        <Text style={styles.focusValue}>{analysisData.totals.salt.toFixed(1)}{t('g')} / {targets.salt}{t('g')}</Text>
                    </View>
                    <View style={[styles.focusBox, { borderColor: analysisData.totals.vitC < targets.vitC * 0.5 ? '#F59E0B' : '#10B981' }]}>
                        <Text style={styles.focusLabel}>Vitamin C</Text>
                        <Text style={styles.focusValue}>{Math.round(analysisData.totals.vitC)}{t('mg')} / {targets.vitC}{t('mg')}</Text>
                    </View>
                </View>

                {/* Weight Trend */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <TrendingUp size={20} color="#1E88E5" />
                        <Text style={styles.cardTitle}>{t('weightTrajectory')}</Text>
                    </View>
                    <LineChart
                        data={{
                            labels: ["W1", "W2", "W3", "W4", "Current"],
                            datasets: [{
                                data: [75, 74.2, 73.5, 73.8, 72.9]
                            }]
                        }}
                        width={screenWidth - 60}
                        height={200}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                    />
                </View>

                <View style={styles.adviceCard}>
                    <Text style={styles.adviceTitle}>{t('labRecommendation')}</Text>
                    <Text style={styles.adviceText}>{advice}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    title: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#1E88E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    legendText: { fontSize: 12, color: '#64748B', marginTop: 10, fontStyle: 'italic' },
    focusRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    focusBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 15, borderWidth: 2 },
    focusLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 4 },
    focusValue: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    adviceCard: { backgroundColor: '#1E88E5', borderRadius: 24, padding: 24, marginBottom: 40 },
    adviceTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    adviceText: { fontSize: 15, color: '#E0F2FE', lineHeight: 22 },
});

export default AnalysisScreen;
