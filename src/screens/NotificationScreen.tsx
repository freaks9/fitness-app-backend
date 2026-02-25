
import { Bell, ChevronRight, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

const NotificationScreen = ({ navigation }: any) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = async (notification: any) => {
        try {
            if (!notification.is_read) {
                // Optimistic update
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
                );

                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notification.id);
            }

            // Navigate to relevant content (assuming reference_id is laboratory related for now)
            // In a real app, you'd fetch the post object here.
            // For MVP, we navigate back to Lab or try to find the post.
            // Since we don't have the full post object here, let's navigate to Community or stay.
            // If the user provided a full navigation flow, we'd use that.
            // For now, let's just mark as read.
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const renderNotification = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.notificationCard, item.is_read ? styles.readCard : styles.unreadCard]}
            onPress={() => handleMarkAsRead(item)}
        >
            <View style={styles.cardContent}>
                {!item.is_read && <View style={styles.unreadDot} />}
                <View style={styles.iconContainer}>
                    <User size={18} color="#64748B" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.message, !item.is_read && styles.unreadMessage]}>{item.message}</Text>
                    <Text style={styles.date}>{new Date(item.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>戻る</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>通知</Text>
                <TouchableOpacity onPress={fetchNotifications} style={styles.refreshButton}>
                    <Bell size={20} color="#1E88E5" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1E88E5" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Bell size={48} color="#E2E8F0" />
                            <Text style={styles.emptyText}>通知はありません</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    backButton: { padding: 8 },
    backText: { color: '#1E88E5', fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    refreshButton: { padding: 8 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingVertical: 8 },
    notificationCard: { marginHorizontal: 16, marginVertical: 4, borderRadius: 16, padding: 16, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    unreadCard: { backgroundColor: '#FFFFFF' },
    readCard: { backgroundColor: '#F1F5F9' },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    unreadDot: { position: 'absolute', left: -8, top: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E88E5' },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    textContainer: { flex: 1 },
    message: { fontSize: 14, color: '#475569', lineHeight: 20 },
    unreadMessage: { color: '#0F172A', fontWeight: '600' },
    date: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#94A3B8', fontWeight: '600' },
});

export default NotificationScreen;
