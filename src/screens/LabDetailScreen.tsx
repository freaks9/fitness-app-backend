
import { MessageCircle, Send, ThumbsUp, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LabPost } from '../context/UserContext';
import { supabase } from '../lib/supabase';
const LAB_PLACEHOLDER = require('../../assets/images/lab_placeholder.png');

const LabDetailScreen = ({ route, navigation }: any) => {
    const { post } = route.params as { post: LabPost };

    // const { profile } = useUser(); // Removed unused
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
    const [hasLiked, setHasLiked] = useState(false);
    const [replyTo, setReplyTo] = useState<{ id: string, name: string, userId: string } | null>(null);
    const [imageError, setImageError] = useState(false);

    const fetchLikesCount = useCallback(async () => {
        if (!post?.id) return;
        const { count } = await supabase
            .from('lab_likes')
            .select('*', { count: 'exact', head: true })
            .eq('report_id', post.id);
        if (count !== null) setLikesCount(count);
    }, [post?.id]);

    const fetchLikeStatus = useCallback(async () => {
        if (!post?.id) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data } = await supabase
                .from('lab_likes')
                .select('id')
                .eq('report_id', post.id)
                .eq('user_id', session.user.id)
                .single();

            setHasLiked(!!data);
            fetchLikesCount();
        } catch (error) {
            console.error('Error fetching like status:', error);
        }
    }, [post?.id, fetchLikesCount]);

    const fetchComments = useCallback(async () => {
        if (!post?.id) return;
        try {
            console.log('fetchComments: Starting for report:', post.id);
            const { data, error } = await supabase
                .from('lab_comments')
                .select('*, profiles(nickname)')
                .eq('report_id', post.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('fetchComments: Supabase error:', error.message, error.details);
                throw error;
            }

            console.log(`fetchComments: Successfully fetched ${data?.length || 0} comments.`);
            setComments(data || []);
        } catch (error: any) {
            console.error('fetchComments: CRITICAL ERROR:', error);
            Alert.alert('考察取得エラー', 'データの読み込みに失敗しました。\n' + (error.message || ''));
        } finally {
            setIsLoading(false);
        }
    }, [post?.id]);

    useEffect(() => {
        if (!post || !post.id) return;

        fetchComments();
        fetchLikeStatus();

        // Realtime subscription for likes
        const likesSubscription = supabase
            .channel(`public:lab_likes:report_id=eq.${post.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_likes', filter: `report_id=eq.${post.id}` }, () => {
                fetchLikesCount();
            })
            .subscribe();

        // Realtime subscription for comments
        const commentsSubscription = supabase
            .channel(`public:lab_comments:report_id=eq.${post.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lab_comments', filter: `report_id=eq.${post.id}` }, (payload) => {
                setComments(prev => [...prev, payload.new]); // Simplified update, ideally fetch profile
                fetchComments(); // Fetch to get profile data
            })
            .subscribe();

        return () => {
            supabase.removeChannel(likesSubscription);
            supabase.removeChannel(commentsSubscription);
        };
    }, [post, fetchComments, fetchLikeStatus, fetchLikesCount]);

    const handleToggleLike = async () => {
        if (post.isMock) {
            Alert.alert('サンプル投稿', 'これはサンプルの研究報告です。実際の投稿をお楽しみください。');
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('エラー', 'ログインが必要です');
                return;
            }

            // Optimistic update
            const newLiked = !hasLiked;
            setHasLiked(newLiked);
            setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

            if (newLiked) {
                await supabase.from('lab_likes').insert([{ user_id: session.user.id, report_id: post.id }]);
            } else {
                await supabase.from('lab_likes').delete().eq('user_id', session.user.id).eq('report_id', post.id);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert
            setHasLiked(!hasLiked);
            setLikesCount(prev => !hasLiked ? prev + 1 : prev - 1);
        }
    };

    if (!post || !post.id) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>戻る</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>エラー</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>投稿データが見つかりませんでした。</Text>
                </View>
            </SafeAreaView>
        );
    }


    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        if (post.isMock) {
            Alert.alert('サンプル投稿', 'サンプルの研究報告にはコメントできません。');
            setNewComment('');
            return;
        }
        setIsSending(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('エラー', 'コメントするにはログインが必要です');
                return;
            }

            // 1. Insert the comment
            const { data: commentData, error: commentError } = await supabase
                .from('lab_comments')
                .insert([{
                    report_id: post.id,
                    user_id: session.user.id,
                    content: newComment.trim(),
                    parent_id: replyTo?.id || null
                }])
                .select()
                .single();

            if (commentError) throw commentError;

            // 2. Insert the notification
            // Target: replyTo's user if reply, else post author
            const targetUserId = replyTo ? replyTo.userId : post.userId;

            // Don't notify if target is invalid (e.g. mock data dummy userId) or self
            const isValidUUID = targetUserId && targetUserId.length > 20 && targetUserId !== '00000000-0000-0000-0000-000000000000';

            if (isValidUUID && targetUserId !== session.user.id) {
                const notificationType = replyTo ? 'reply' : 'comment';
                const notificationMessage = replyTo
                    ? `あなたの考察に返信が届きました: "${newComment.substring(0, 20)}..."`
                    : `あなたの研究報告に新しい考察が届きました: "${newComment.substring(0, 20)}..."`;

                try {
                    await supabase.from('notifications').insert([{
                        user_id: targetUserId,
                        sender_id: session.user.id,
                        type: notificationType,
                        reference_id: commentData.id,
                        message: notificationMessage,
                        is_read: false
                    }]);
                } catch (notifErr) {
                    console.warn('Failed to send notification (likely RLS or invalid user):', notifErr);
                }
            }

            setNewComment('');
            setReplyTo(null);
            fetchComments();
        } catch (error: any) {
            Alert.alert('エラー', '送信に失敗しました: ' + error.message);
        } finally {
            setIsSending(false);
        }
    };

    const renderComment = ({ item }: { item: any }) => (
        <View style={[styles.commentItem, item.parent_id && styles.replyItem]}>
            <View style={styles.commentHeader}>
                <View style={styles.avatar}>
                    <User size={14} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.commentUser}>{item.profiles?.nickname || '名無し研究員'}</Text>
                        <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setReplyTo({ id: item.id, name: item.profiles?.nickname || '研究員', userId: item.user_id })}
                    style={styles.replyButton}
                >
                    <Text style={styles.replyButtonText}>返信</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.commentContent}>{item.content}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>戻る</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>研究考察</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.postContainer}>
                        <View style={styles.postHeader}>
                            <Text style={styles.postTitle}>{post.mealName}</Text>
                            <View style={styles.postMeta}>
                                <Text style={styles.postUser}>by {post.userName}</Text>
                                <Text style={styles.postDate}>{post.date}</Text>
                            </View>
                        </View>

                        {post.imageUrl && !imageError && (
                            <Image
                                source={{ uri: post.imageUrl }}
                                style={styles.postImage}
                                resizeMode="cover"
                                onError={() => setImageError(true)}
                            />
                        )}
                        {(imageError || !post.imageUrl) && (
                            <Image
                                source={LAB_PLACEHOLDER}
                                style={styles.postImage}
                                resizeMode="cover"
                            />
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.likeButton, hasLiked && styles.likeButtonActive]}
                                onPress={handleToggleLike}
                            >
                                <ThumbsUp size={20} color={hasLiked ? "#FFFFFF" : "#64748B"} />
                                <Text style={[styles.likeText, hasLiked && styles.likeTextActive]}>有用 ({likesCount})</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.postMemo}>{post.memo}</Text>

                        <View style={styles.statsRow}>
                            {/* Simplify stats for header */}
                            <Text style={styles.statText}>🔥 {post.calories || 0} kcal</Text>
                            <Text style={styles.statText}>P: {post.pfc?.protein || 0}g</Text>
                            <Text style={styles.statText}>F: {post.pfc?.fat || 0}g</Text>
                            <Text style={styles.statText}>C: {post.pfc?.carbs || 0}g</Text>
                        </View>

                        <View style={styles.divider} />
                        <Text style={styles.sectionTitle}>研究員たちの考察 ({comments.length})</Text>
                    </View>
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <MessageCircle size={40} color="#E2E8F0" />
                            <Text style={styles.emptyText}>まだ考察はありません</Text>
                            <Text style={styles.emptySubText}>最初の意見を投稿しましょう</Text>
                        </View>
                    ) : (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#1E88E5" />
                    )
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {replyTo && (
                    <View style={styles.replyIndicator}>
                        <Text style={styles.replyIndicatorText}>{replyTo.name} さんに返信中...</Text>
                        <TouchableOpacity onPress={() => setReplyTo(null)}>
                            <Text style={styles.cancelReplyText}>キャンセル</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder={replyTo ? "返信を入力..." : "この研究への考察を入力..."}
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!newComment.trim() || isSending) && styles.sendButtonDisabled]}
                        onPress={handleSendComment}
                        disabled={!newComment.trim() || isSending}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Send size={20} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    backButton: { padding: 8 },
    backText: { color: '#1E88E5', fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    listContent: { paddingBottom: 20 },
    postContainer: { padding: 20, backgroundColor: '#FFFFFF', marginBottom: 10 },
    postHeader: { marginBottom: 12 },
    postTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
    postMeta: { flexDirection: 'row', gap: 10 },
    postUser: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    postDate: { fontSize: 14, color: '#94A3B8' },
    postImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
    actionRow: { flexDirection: 'row', marginBottom: 16 },
    likeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 8 },
    likeButtonActive: { backgroundColor: '#1E88E5' },
    likeText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    likeTextActive: { color: '#FFFFFF' },
    postMemo: { fontSize: 15, color: '#334155', lineHeight: 24, marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    statText: { fontSize: 14, fontWeight: '700', color: '#475569' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    commentItem: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    commentUser: { fontSize: 13, fontWeight: '700', color: '#334155' },
    commentDate: { fontSize: 12, color: '#94A3B8' },
    commentContent: { fontSize: 14, color: '#1E293B', lineHeight: 20, marginLeft: 32 },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#CBD5E1', marginTop: 4 },
    inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: '#0F172A', marginRight: 10 },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: '#CBD5E1' },
    replyItem: { marginLeft: 32, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
    replyButton: { paddingHorizontal: 8, paddingVertical: 4 },
    replyButtonText: { fontSize: 12, color: '#1E88E5', fontWeight: '700' },
    replyIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    replyIndicatorText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    cancelReplyText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
});

export default LabDetailScreen;
