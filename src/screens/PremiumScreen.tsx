import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as IAP from 'react-native-iap';
import { CONFIG } from '../constants/Config';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { IAPService } from '../services/IAPService';

const PremiumScreen = () => {
    const navigation = useNavigation();
    const { t } = useLanguageContext();
    const { updateProfile } = useUser();
    const [loading, setLoading] = useState(false);
    const [subscriptions, setSubscriptions] = useState<IAP.Product[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                await IAPService.init();
                const subs = await IAPService.getSubscriptions();
                setSubscriptions(subs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
        return () => { IAPService.end(); };
    }, []);

    const handlePurchase = async (sku: string) => {
        setLoading(true);
        try {
            await IAPService.requestSubscription(sku);
            // Purchase update listener in UserContext will handle the state update
        } catch (err: any) {
            if (err.code !== 'E_USER_CANCELLED') {
                Alert.alert(t('error'), err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            const history = await IAPService.getPurchaseHistory();
            if (history && history.length > 0) {
                await updateProfile({ isPremium: true });
                Alert.alert(t('success'), '購入内容を復元しました。');
                navigation.goBack();
            } else {
                Alert.alert('お知らせ', '復元できる購入内容が見つかりませんでした。');
            }
        } catch (_err) {
            Alert.alert(t('error'), '復元に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    const PlanCard = ({ sku, title, price, period, trial, highlight = false, badge = '' }: any) => (
        <TouchableOpacity
            style={[styles.planCard, highlight && styles.highlightCard]}
            onPress={() => handlePurchase(sku)}
            disabled={loading}
        >
            {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
            <Text style={[styles.planTitle, highlight && styles.highlightText]}>{title}</Text>
            <View style={styles.priceContainer}>
                <Text style={[styles.planPrice, highlight && styles.highlightText]}>{price}</Text>
                <Text style={[styles.planPeriod, highlight && styles.highlightText]}>/{period}</Text>
            </View>
            <Text style={[styles.trialText, highlight && styles.highlightText]}>{trial}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1A237E', '#121212']} style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                <Ionicons name="star" size={60} color="#FFD700" style={styles.starIcon} />
                <Text style={styles.headerTitle}>Premium</Text>
                <Text style={styles.headerSubtitle}>すべての機能を開放して、最高の研究を。</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.benefitsContainer}>
                    <BenefitItem icon="infinite" text="AI解析が回数制限なしで使い放題" />
                    <BenefitItem icon="megaphone-outline" text="すべての広告（バナー・全画面）を非表示" />
                    <BenefitItem icon="flask-outline" text="今後の新機能への先行アクセス" />
                    <BenefitItem icon="cloud-upload-outline" text="データのクラウドバックアップ" />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.plansContainer}>
                        <PlanCard
                            sku={CONFIG.IAP_PRODUCT_IDS.YEARLY}
                            title="年払いプラン"
                            price="¥3,000"
                            period="年"
                            trial="7日間無料（その後 ¥3,000/年）"
                            highlight={true}
                            badge="一番人気 / 20%お得"
                        />
                        <PlanCard
                            sku={CONFIG.IAP_PRODUCT_IDS.MONTHLY}
                            title="月額プラン"
                            price="¥300"
                            period="月"
                            trial="7日間無料（その後 ¥300/月）"
                        />
                    </View>
                )}

                <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                    <Text style={styles.restoreText}>以前の購入内容を復元する</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        お支払いはApple IDアカウントに請求されます。現在の期間が終了する少なくとも24時間前に自動更新をオフにしない限り、サブスクリプションは自動的に更新されます。
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const BenefitItem = ({ icon, text }: any) => (
    <View style={styles.benefitItem}>
        <Ionicons name={icon} size={24} color="#FFD700" />
        <Text style={styles.benefitText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 40, paddingTop: 60, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    backButton: { position: 'absolute', top: 50, left: 20 },
    starIcon: { marginBottom: 10 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
    headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 10, textAlign: 'center' },
    content: { padding: 20 },
    benefitsContainer: { marginVertical: 20 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    benefitText: { fontSize: 16, color: '#333', marginLeft: 15, fontWeight: '500' },
    plansContainer: { marginTop: 10 },
    planCard: {
        backgroundColor: '#F5F5F7',
        borderRadius: 20,
        padding: 25,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    highlightCard: {
        backgroundColor: '#1E88E5',
        borderColor: '#1565C0',
        transform: [{ scale: 1.05 }],
        elevation: 10,
        shadowColor: '#1E88E5',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
    },
    planTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
    planPrice: { fontSize: 28, fontWeight: '800', color: '#333' },
    planPeriod: { fontSize: 16, color: '#8E8E93', marginLeft: 4 },
    trialText: { fontSize: 14, color: '#8E8E93', marginTop: 8 },
    highlightText: { color: 'white' },
    badge: {
        position: 'absolute',
        top: -12,
        right: 20,
        backgroundColor: '#FFD700',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
    restoreButton: { alignSelf: 'center', marginTop: 20, marginBottom: 40 },
    restoreText: { color: '#8E8E93', fontSize: 14, textDecorationLine: 'underline' },
    footer: { paddingHorizontal: 10, marginBottom: 40 },
    footerText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', lineHeight: 18 },
});

export default PremiumScreen;
