import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Briefcase, Crown, Hash, Heart, Info, LogOut, MessageSquare, Microscope, Settings, Shield, Trophy, User, Zap } from 'lucide-react-native';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const RANK_CONFIG = {
    STANDARD: {
        label: 'STANDARD',
        name: 'スタンダード',
        icon: Microscope,
        colors: ['#F8FAFC', '#F1F5F9'] as [string, string],
        accent: '#1E88E5',
        text: '#1E88E5'
    },
    SILVER: {
        label: 'SILVER',
        name: 'シルバー',
        icon: Shield,
        colors: ['#E2E8F0', '#CBD5E1'] as [string, string],
        accent: '#64748B',
        text: '#475569'
    },
    GOLD: {
        label: 'GOLD',
        name: 'ゴールド',
        icon: Trophy,
        colors: ['#FEF3C7', '#FDE68A'] as [string, string],
        accent: '#D4AF37',
        text: '#B45309'
    },
    PLATINUM: {
        label: 'PLATINUM',
        name: 'プラチナ',
        icon: Crown,
        colors: ['#F1F5F9', '#E2E8F0'] as [string, string],
        accent: '#94A3B8',
        text: '#1E293B'
    }
};

const MyPageScreen = () => {
    const { user, logout } = useAuth();
    const { profile, updateProfile, labStats } = useUser();
    const { t } = useLanguageContext();

    const nickname = profile.nickname || t('guestResearcher');
    const researcherId = user?.id?.substring(0, 8).toUpperCase() || 'GUEST-01';

    const currentWeight = profile.weightKg || '--';
    const avgSalt = 7.2; // Mocked stat

    const rank = labStats.rank || 'STANDARD';
    const config = RANK_CONFIG[rank];
    const RankIcon = config.icon;

    const handleUpdateTone = (tone: 'professional' | 'friendly' | 'strict') => {
        updateProfile({
            aiCoachSettings: {
                ...profile.aiCoachSettings!,
                tone
            }
        });
    };

    const handleUpdateSensitivity = (delta: number) => {
        const newSensitivity = Math.max(0, Math.min(100, (profile.aiCoachSettings?.warningSensitivity || 70) + delta));
        updateProfile({
            aiCoachSettings: {
                ...profile.aiCoachSettings!,
                warningSensitivity: newSensitivity
            }
        });
    };

    const handleLogout = () => {
        Alert.alert('ログアウト', 'ログアウトしてもよろしいですか？', [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'ログアウト', style: 'destructive', onPress: () => logout() }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <Text style={styles.headerTitle}>研究者プロフィール</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <LogOut size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card with Rank Gradient */}
                <LinearGradient
                    colors={config.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileCard}
                >
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={40} color={config.accent} />
                        </View>
                        <View style={[styles.rankBadge, { backgroundColor: config.accent }]}>
                            <RankIcon size={12} color="white" />
                        </View>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.nickname}>{nickname}</Text>
                        <View style={styles.idRow}>
                            <Hash size={12} color="#64748B" />
                            <Text style={styles.resercherId}>ID: {researcherId}</Text>
                        </View>
                        <View style={[styles.rankBadgeText, { backgroundColor: config.accent + '20' }]}>
                            <Text style={[styles.rankLabel, { color: config.text }]}>{config.name} 研究員</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Stats Grid with Rank Theme */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: config.accent }]}>
                        <Briefcase size={20} color={config.accent} style={styles.statIcon} />
                        <Text style={styles.statValue}>{currentWeight} kg</Text>
                        <Text style={styles.statLabel}>最新体重</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: '#FF9500' }]}>
                        <Zap size={20} color="#FF9500" style={styles.statIcon} />
                        <Text style={styles.statValue}>{avgSalt} g</Text>
                        <Text style={styles.statLabel}>平均塩分</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: '#10B981' }]}>
                        <RankIcon size={20} color="#10B981" style={styles.statIcon} />
                        <Text style={styles.statValue}>{labStats.totalPoints}</Text>
                        <Text style={styles.statLabel}>貢献ポイント</Text>
                    </View>
                </View>

                {/* AI Coach Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MessageSquare size={18} color="#1E88E5" />
                        <Text style={styles.sectionTitle}>AIコーチ設定 (Smart Blue)</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>コーチの口調</Text>
                        <View style={styles.toneSelector}>
                            {(['professional', 'friendly', 'strict'] as const).map((tone) => (
                                <TouchableOpacity
                                    key={tone}
                                    style={[
                                        styles.toneButton,
                                        profile.aiCoachSettings?.tone === tone && styles.toneButtonActive
                                    ]}
                                    onPress={() => handleUpdateTone(tone)}
                                >
                                    <Text style={[
                                        styles.toneButtonText,
                                        profile.aiCoachSettings?.tone === tone && styles.toneButtonTextActive
                                    ]}>
                                        {tone === 'professional' ? '標準' : tone === 'friendly' ? '親身' : '厳格'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={styles.settingLabel}>警告感度</Text>
                            <Text style={styles.sensitivityValue}>{profile.aiCoachSettings?.warningSensitivity}%</Text>
                        </View>
                        <View style={styles.sensitivityControl}>
                            <TouchableOpacity onPress={() => handleUpdateSensitivity(-5)} style={styles.controlBtn}>
                                <Text style={styles.controlBtnText}>−</Text>
                            </TouchableOpacity>
                            <View style={styles.sensitivityBarContainer}>
                                <View style={[styles.sensitivityBar, { width: `${profile.aiCoachSettings?.warningSensitivity ?? 70}%` as any }]} />
                            </View>
                            <TouchableOpacity onPress={() => handleUpdateSensitivity(5)} style={styles.controlBtn}>
                                <Text style={styles.controlBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Contribution Details */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Microscope size={18} color={config.accent} />
                        <Text style={styles.sectionTitle}>研究実績詳細</Text>
                    </View>
                    <View style={styles.contributionRow}>
                        <View style={styles.contributionItem}>
                            <Heart size={16} color="#EF4444" />
                            <Text style={styles.contributionText}>有用数: {labStats.usefulCount}</Text>
                        </View>
                        <View style={styles.contributionItem}>
                            <Settings size={16} color="#475569" />
                            <Text style={styles.contributionText}>再現数: {labStats.replicateCount}</Text>
                        </View>
                    </View>
                </View>

                {/* Account Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Settings size={18} color="#1E88E5" />
                        <Text style={styles.sectionTitle}>アカウント・システム</Text>
                    </View>

                    {[
                        { icon: Heart, label: 'ヘルスケア連携 (Apple Health)', color: "#EF4444" },
                        { icon: Bell, label: '解析完了通知', color: "#1E88E5" },
                        { icon: Shield, label: 'データプライバシー設定', color: "#10B981" },
                        { icon: Info, label: 'アプリについて / 法的情報', color: "#64748B" }
                    ].map((item, idx) => (
                        <TouchableOpacity key={idx} style={styles.menuItem}>
                            <View style={[styles.menuIconCircle, { backgroundColor: item.color + '15' }]}>
                                <item.icon size={18} color={item.color} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.chevron}>→</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Smart Blue Diet Lab v1.2.0</Text>
                    <Text style={styles.footerText}>Researcher Office Environment</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5 },
    scrollContent: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 10 },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    avatarContainer: { position: 'relative' },
    avatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    rankBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    profileInfo: { marginLeft: 20 },
    nickname: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    idRow: { flexDirection: 'row', alignItems: 'center' },
    resercherId: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginLeft: 4 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statBox: { flex: 0.31, backgroundColor: '#fff', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    statIcon: { marginBottom: 8 },
    statValue: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    statLabel: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' },
    rankBadgeText: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    rankLabel: { fontSize: 12, fontWeight: '800' },
    contributionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 },
    contributionItem: { flexDirection: 'row', alignItems: 'center' },
    contributionText: { marginLeft: 8, fontSize: 14, color: '#475569', fontWeight: '600' },
    section: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginLeft: 10 },
    settingItem: { marginBottom: 20 },
    settingLabel: { fontSize: 14, color: '#475569', fontWeight: '700', marginBottom: 12 },
    toneSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
    toneButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toneButtonActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    toneButtonText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    toneButtonTextActive: { color: '#1E88E5', fontWeight: '800' },
    sensitivityValue: { fontSize: 14, color: '#1E88E5', fontWeight: '800' },
    sensitivityControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    controlBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    controlBtnText: { fontSize: 20, color: '#1E293B', fontWeight: '600' },
    sensitivityBarContainer: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginHorizontal: 15, overflow: 'hidden' },
    sensitivityBar: { height: '100%', backgroundColor: '#1E88E5', borderRadius: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    menuIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuLabel: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '600' },
    chevron: { fontSize: 18, color: '#CBD5E1' },
    footer: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
    footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', lineHeight: 18 },
});

export default MyPageScreen;
