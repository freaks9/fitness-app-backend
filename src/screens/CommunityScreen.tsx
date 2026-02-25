
import { useFocusEffect } from '@react-navigation/native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { BarChart2, Check, ChevronDown, Filter, Info, Lightbulb, MessageCircle, Microscope, Plus, Search, Send, Star, Tag, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { DIET_METHODS, getDietMethodColor, getDietMethodLabel } from '../constants/dietMethods';
import { LabPost, useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

const LAB_PLACEHOLDER = require('../../assets/images/lab_placeholder.png');

const screenWidth = Dimensions.get('window').width;

const CommunityScreen = ({ navigation }: any) => {
    // const { t } = useLanguageContext(); // Removed unused 't'
    const { labPosts, profile, todaysMeals, savedMenus, saveMenu, unsaveMenu } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedPost, setSelectedPost] = useState<LabPost | null>(null);
    const [dbPosts, setDbPosts] = useState<LabPost[]>([]);
    // isLoading removed (unused)
    const [isPostModalVisible, setIsPostModalVisible] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [postComment, setPostComment] = useState('');
    const [selectedMethod, setSelectedMethod] = useState(DIET_METHODS[0].id);
    const [isRecommended, setIsRecommended] = useState(false);
    const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
    const [imageErrorIds, setImageErrorIds] = useState<Set<string>>(new Set());
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    // Marquee logic
    const scrollRef = useRef<ScrollView>(null);
    const scrollX = useRef(0);
    const [contentWidth, setContentWidth] = useState(0);
    const statsMessages = useMemo(() => [
        "🔬 本日のラボ平均摂取カロリー: 1,840 kcal",
        "💡 最も注目されている栄養素: オメガ3脂肪酸",
        "📈 週間タンパク質研究数: +12.4%",
        "🧬 脂質メタボリズム研究が活発です "
    ], []);

    // Duplicate for seamless loop illusion
    const marqueeMessages = useMemo(() => [
        ...statsMessages,
        ...statsMessages,
        ...statsMessages,
        ...statsMessages
    ], [statsMessages]);

    useEffect(() => {
        const scrollSpeed = 0.5; // pixels per tick
        const interval = setInterval(() => {
            if (scrollRef.current && contentWidth > 0) {
                scrollX.current += scrollSpeed;

                // Reset if we've scrolled past the first set (approximate)
                // A better way is to reset when we reach end - screenWidth, but simple loop is fine for now.
                // Let's just scroll continuously.
                if (scrollX.current > contentWidth - screenWidth) {
                    scrollX.current = 0; // Snap back (imperfect but functional)
                }

                scrollRef.current.scrollTo({ x: scrollX.current, animated: false });
            }
        }, 20);
        return () => clearInterval(interval);
    }, [contentWidth]);


    const latestMeal = useMemo(() => {
        if (todaysMeals.length === 0) return null;
        return todaysMeals[todaysMeals.length - 1];
    }, [todaysMeals]);

    const fetchPosts = async () => {
        // isLoading removed (unused)
        try {
            console.log('fetchPosts: Starting data fetch...');
            const { data, error } = await supabase
                .from('lab_reports')
                .select(`
                    id,
                    user_id,
                    dish_name,
                    nutrients,
                    comment,
                    image_url,
                    created_at,
                    method_tag,
                    is_recommended,
                    profiles (nickname),
                    lab_likes (count),
                    lab_comments (count)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('fetchPosts: Supabase error:', error.message, error.details);
                throw error;
            }

            if (data) {
                console.log(`fetchPosts: Successfully fetched ${data.length} reports.`);
                const mapped: LabPost[] = data.map((item: any) => {
                    try {
                        return {
                            id: item.id,
                            userId: item.user_id,
                            mealName: item.dish_name,
                            userName: item.profiles?.nickname || '研究員',
                            date: new Date(item.created_at).toLocaleDateString(),
                            pfc: {
                                protein: Number(item.nutrients?.protein) || 0,
                                fat: Number(item.nutrients?.fat) || 0,
                                carbs: Number(item.nutrients?.carbs) || 0
                            },
                            calories: Number(item.nutrients?.calories) || 0,
                            tags: Array.isArray(item.nutrients?.tags) ? item.nutrients.tags : [],
                            memo: item.comment || '',
                            imageUrl: item.image_url || undefined,
                            methodTag: item.method_tag || 'other',
                            isRecommended: item.is_recommended || false,
                            nutrientsDetail: Array.isArray(item.nutrients?.details) ? item.nutrients.details : [],
                            likesCount: Number(item.lab_likes?.[0]?.count) || 0,
                            commentsCount: Number(item.lab_comments?.[0]?.count) || 0
                        };
                    } catch (mapErr) {
                        console.error('fetchPosts: Mapping error for item:', item.id, mapErr);
                        throw mapErr;
                    }
                });
                setDbPosts(mapped);

                // Fetch user's liked status
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: likesData, error: likesError } = await supabase
                        .from('lab_likes')
                        .select('report_id')
                        .eq('user_id', session.user.id);

                    if (likesError) {
                        console.error('fetchPosts: Error fetching likes status:', likesError.message);
                    } else if (likesData) {
                        const likedSet = new Set(likesData.map((l: any) => l.report_id));
                        setLikedPostIds(likedSet);
                    }
                }
            }
        } catch (err: any) {
            console.error('fetchPosts: CRITICAL ERROR:', err);
            Alert.alert(
                'ラボ通信エラー',
                'データの取得中にエラーが発生しました。接続状況を確認のうえ再度お試しください。\n' + (err.message || '')
            );
        } finally {
            // isLoading removed (unused)
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchPosts();
        }, [])
    );

    const categories = ['All', ...DIET_METHODS.map(m => m.label)];

    const handleSelectImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('アクセス拒否', '写真へのアクセス許可が必要です。');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImageUri(result.assets[0].uri);
        }
    };

    const allPosts = useMemo(() => {
        // Combine static mock posts and DB posts for a richer experience in MVP
        return [...dbPosts, ...labPosts];
    }, [dbPosts, labPosts]);

    const handleToggleLike = async (post: LabPost) => {
        if (post.isMock) {
            Alert.alert('サンプル投稿', 'これはサンプルの研究報告です。「いいね」や「コメント」は実際の投稿に対してのみ行えます。');
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('エラー', 'ログインが必要です');
                return;
            }

            const isLiked = likedPostIds.has(post.id);

            // Optimistic update
            const newLikedIds = new Set(likedPostIds);
            if (isLiked) {
                newLikedIds.delete(post.id);
                // Update local post count
                setDbPosts(prev => prev.map(p => p.id === post.id ? { ...p, likesCount: (p.likesCount || 0) - 1 } : p));
            } else {
                newLikedIds.add(post.id);
                setDbPosts(prev => prev.map(p => p.id === post.id ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p));
            }
            setLikedPostIds(newLikedIds);

            if (isLiked) {
                await supabase.from('lab_likes').delete().eq('user_id', session.user.id).eq('report_id', post.id);
            } else {
                await supabase.from('lab_likes').insert([{ user_id: session.user.id, report_id: post.id }]);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            fetchPosts(); // Revert by refreshing
        }
    };

    const handleUploadPost = async () => {
        if (!latestMeal) {
            Alert.alert('エラー', '最新の解析データが見つかりません。先に食事を記録してください。');
            return;
        }

        setIsUploading(true);
        try {
            // Get current user session
            let { data: { session } } = await supabase.auth.getSession();

            // If no session, try anonymous sign-in (must be enabled in Supabase dashboard)
            if (!session) {
                const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
                if (signInError) {
                    console.warn('Anonymous sign-in failed:', signInError.message);
                } else {
                    session = signInData.session;
                }
            }

            // If still no session, we cannot proceed with RLS
            if (!session) {
                throw new Error('認証セッションを確立できませんでした。SupabaseのAnonymous Auth設定を確認してください。');
            }

            // Ensure profile exists if we have a session
            const { data: existingProfile, error: profileCheckError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

            if (profileCheckError && profileCheckError.code !== 'PGRST116') {
                console.warn('Profile check error:', profileCheckError);
            }

            if (!existingProfile) {
                const { error: profileInsertError } = await supabase.from('profiles').insert([{
                    id: session.user.id,
                    nickname: profile.nickname || 'ラボ研究員',
                    goal_calories: profile.goal || 2000
                }]);
                if (profileInsertError) {
                    throw new Error(`プロフィールの自動生成に失敗しました: ${profileInsertError.message}`);
                }
            }

            const nutrientsData = {
                calories: latestMeal.calories || 0,
                protein: latestMeal.protein || 0,
                fat: latestMeal.fat || 0,
                carbs: latestMeal.carbs || 0,
                tags: latestMeal.tags || ['研究報告'],
                details: latestMeal.nutrientsDetail || []
            };

            let publicImageUrl = null;
            const imageToUpload = selectedImageUri || latestMeal.imageUri;

            if (imageToUpload) {
                try {
                    const fileExt = 'jpg';
                    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
                    const filePath = fileName;

                    console.log('Processing image for upload:', imageToUpload);

                    // 1. Resize/Compress the image first
                    const manipResult = await manipulateAsync(
                        imageToUpload,
                        [{ resize: { width: 1024 } }],
                        { compress: 0.8, format: SaveFormat.JPEG }
                    );

                    // 2. Fetch the manipulated file and get it as a Blob
                    // This is much more reliable in React Native than base64/Uint8Array conversion
                    const response = await fetch(manipResult.uri);
                    const blob = await response.blob();

                    console.log(`Blob ready for upload. Size: ${blob.size} bytes, Type: ${blob.type}`);

                    if (blob.size === 0) {
                        throw new Error('生成された画像データが0バイトです。再度お試しください。');
                    }

                    const { error: uploadError } = await supabase.storage
                        .from('meal-images')
                        .upload(filePath, blob, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error('Image upload failed:', uploadError.message);
                        throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
                    }

                    // For storage buckets marked as Public, getPublicUrl is the correct way
                    const { data: urlData } = supabase.storage
                        .from('meal-images')
                        .getPublicUrl(filePath);

                    if (urlData?.publicUrl) {
                        publicImageUrl = urlData.publicUrl;
                        console.log('Public image URL generated:', publicImageUrl);
                    } else {
                        console.warn('Could not generate public URL for uploaded image');
                    }
                } catch (imgErr: any) {
                    console.error('Image processing or upload error:', imgErr);
                }
            }

            const { error: insertError } = await supabase
                .from('lab_reports')
                .insert([{
                    dish_name: latestMeal.name || latestMeal.mealName || '不明な料理',
                    nutrients: nutrientsData,
                    comment: postComment,
                    user_id: session.user.id,
                    image_url: publicImageUrl,
                    method_tag: selectedMethod,
                    is_recommended: isRecommended
                }]);

            if (insertError) {
                throw new Error(`データベースへの保存に失敗しました: ${insertError.message}`);
            }

            Alert.alert('ラボ報告完了', '研究報告が正常にアップロードされました。');
            setIsPostModalVisible(false);
            setPostComment('');
            setSelectedImageUri(null); // Reset after success
            fetchPosts(); // Refresh feed
        } catch (err: any) {
            console.error('Upload error:', err);
            Alert.alert('エラー', '報告のアップロードに失敗しました。' + (err.message || ''));
        } finally {
            setIsUploading(false);
        }
    };

    const filteredPosts = useMemo(() => {
        return allPosts.filter(post => {
            const mealName = post.mealName || '';
            const memo = post.memo || '';
            const matchesSearch = mealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                memo.toLowerCase().includes(searchQuery.toLowerCase());
            // Filter by methodTag instead of generic tags for the main category filter
            const matchesCategory = selectedCategory === 'All' || getDietMethodLabel(post.methodTag || 'other') === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [allPosts, searchQuery, selectedCategory]);

    const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
    const regularPosts = filteredPosts.slice(1);

    const renderLabCard = (post: LabPost, isFeatured = false) => (
        <TouchableOpacity
            key={post.id}
            style={[styles.postCard, isFeatured && styles.featuredCard]}
            onPress={() => setSelectedPost(post)}
        >
            {isFeatured && (
                <View style={styles.featuredBadge}>
                    <Lightbulb size={14} color="#FFFFFF" />
                    <Text style={styles.featuredBadgeText}>注目の研究</Text>
                </View>
            )}
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <View style={styles.researchIcon}>
                        <Microscope size={16} color="#1E88E5" />
                    </View>
                    <View>
                        <Text style={styles.userName}>{post.userName}</Text>
                        <Text style={styles.postDate}>{post.date}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.caloriesBadge}>
                        <Text style={styles.caloriesText}>{post.calories} kcal</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.bookmarkButton}
                        onPress={() => {
                            const isSaved = savedMenus.some(m => m.report_id === post.id);
                            if (isSaved) {
                                unsaveMenu(post.id);
                            } else {
                                saveMenu(post.id);
                                Alert.alert("保存完了", "マイメニューに保存しました");
                            }
                        }}
                    >
                        <View style={[styles.bookmarkIcon, savedMenus.some(m => m.report_id === post.id) && styles.bookmarkIconActive]}>
                            <Star
                                size={20}
                                color={savedMenus.some(m => m.report_id === post.id) ? "#FFFFFF" : "#94A3B8"}
                                fill={savedMenus.some(m => m.report_id === post.id) ? "#FFFFFF" : "none"}
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <View style={[styles.methodBadge, { backgroundColor: getDietMethodColor(post.methodTag || 'other') + '20' }]}>
                    <Text style={[styles.methodText, { color: getDietMethodColor(post.methodTag || 'other') }]}>
                        {getDietMethodLabel(post.methodTag || 'other')}
                    </Text>
                </View>
                {post.isRecommended && (
                    <View style={styles.recommendedBadge}>
                        <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} />
                        <Text style={styles.recommendedText}>おすすめ</Text>
                    </View>
                )}
            </View>


            <Text style={styles.mealName}>{post.mealName}</Text>

            <Image
                source={post.imageUrl && !imageErrorIds.has(post.id) ? { uri: post.imageUrl } : LAB_PLACEHOLDER}
                style={[styles.postImage, isFeatured && styles.featuredImage]}
                resizeMode="cover"
                onLoad={() => console.log('Image loaded:', post.imageUrl)}
                onError={(e) => {
                    console.log('Image load error (handled):', post.imageUrl);
                    setImageErrorIds(prev => new Set(prev).add(post.id));
                }}
            />

            <View style={styles.pfcRow}>
                <View style={styles.pfcItem}>
                    <Text style={[styles.pfcLabel, { color: '#FF9500' }]}>P</Text>
                    <View style={styles.pfcBarContainer}>
                        <View style={[styles.pfcBar, { width: `${Math.min(100, (post.pfc.protein / 50) * 100)}%`, backgroundColor: '#FF9500' }]} />
                    </View>
                    <Text style={styles.pfcValue}>{post.pfc.protein}g</Text>
                </View>
                <View style={styles.pfcItem}>
                    <Text style={[styles.pfcLabel, { color: '#FF2D55' }]}>F</Text>
                    <View style={styles.pfcBarContainer}>
                        <View style={[styles.pfcBar, { width: `${Math.min(100, (post.pfc.fat / 50) * 100)}%`, backgroundColor: '#FF2D55' }]} />
                    </View>
                    <Text style={styles.pfcValue}>{post.pfc.fat}g</Text>
                </View>
                <View style={styles.pfcItem}>
                    <Text style={[styles.pfcLabel, { color: '#34C759' }]}>C</Text>
                    <View style={styles.pfcBarContainer}>
                        <View style={[styles.pfcBar, { width: `${Math.min(100, (post.pfc.carbs / 100) * 100)}%`, backgroundColor: '#34C759' }]} />
                    </View>
                    <Text style={styles.pfcValue}>{post.pfc.carbs}g</Text>
                </View>
            </View>

            <View style={styles.socialRow}>
                <TouchableOpacity
                    style={[styles.socialBtn, likedPostIds.has(post.id) && { backgroundColor: '#E0F2FE' }]}
                    onPress={() => handleToggleLike(post)}
                >
                    <Lightbulb
                        size={18}
                        color={likedPostIds.has(post.id) ? "#1E88E5" : "#64748B"}
                        fill={likedPostIds.has(post.id) ? "#1E88E5" : "none"}
                    />
                    <Text style={[styles.socialText, likedPostIds.has(post.id) && { color: "#1E88E5" }]}>
                        有用 ({post.likesCount || 0})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => {
                        if (post.id) {
                            // @ts-ignore
                            navigation.navigate('LabDetail', { post });
                        }
                    }}
                >
                    <MessageCircle size={18} color="#64748B" />
                    <Text style={styles.socialText}>考察 ({post.commentsCount || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                    {/* Placeholder for Share or copy */}
                </TouchableOpacity>
            </View>

            <Text style={styles.memoText} numberOfLines={2}>{post.memo}</Text>

            <View style={styles.tagsRow}>
                {post.tags.map((tag, index) => (
                    <View key={index} style={styles.tagBadge}>
                        <Tag size={10} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.tagText}>{tag}</Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );

    const chartConfig = {
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
        style: { borderRadius: 16 },
        propsForLabels: { fontSize: 10, fontWeight: '600' }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.statsCarousel}>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={statsMessages.length > 0 ? styles.statsScroll : { display: 'none' }}
                    onContentSizeChange={(w) => setContentWidth(w)}
                    scrollEnabled={false}
                >
                    {marqueeMessages.map((msg, i) => (
                        <Text key={i} style={styles.statsText}>{msg}      </Text>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} stickyHeaderIndices={[1]}>
                <View style={styles.header}>
                    <Text style={styles.title}>ダイエットラボ</Text>
                    <Text style={styles.subtitle}>Diet Research Lab</Text>
                </View>

                <View style={styles.searchWrapper}>
                    <View style={styles.searchContainer}>
                        <Search size={20} color="#94A3B8" style={{ marginLeft: 12 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ダイエット研究を検索..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity style={styles.filterButton}>
                            <Filter size={20} color="#1E88E5" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.feedContainer}>
                    {featuredPost && (
                        <>
                            <View style={styles.sectionHeader}>
                                <Lightbulb size={18} color="#1E88E5" />
                                <Text style={[styles.sectionTitle, { color: '#1E88E5' }]}>注目の研究</Text>
                            </View>
                            {renderLabCard(featuredPost, true)}
                        </>
                    )}

                    <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                        <BarChart2 size={18} color="#64748B" />
                        <Text style={styles.sectionTitle}>最新の研究報告</Text>
                    </View>

                    {regularPosts.map((post) => renderLabCard(post))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    if (!latestMeal) {
                        Alert.alert('記録が必要です', '先に食事を記録してください。');
                        return;
                    }
                    setIsPostModalVisible(true);
                }}
                activeOpacity={0.8}
            >
                <Plus size={30} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal
                visible={isPostModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPostModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
                    <View style={[styles.modalContent, { height: 'auto', maxHeight: '90%', borderRadius: 32 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>研究報告のアップロード</Text>
                            <TouchableOpacity onPress={() => {
                                setIsPostModalVisible(false);
                                setSelectedImageUri(null);
                            }}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubTitle}>リサーチ項目を編集</Text>

                            {/* Image Selection */}
                            <TouchableOpacity
                                style={styles.imageSelector}
                                onPress={handleSelectImage}
                                disabled={isUploading}
                            >
                                {selectedImageUri || (latestMeal && latestMeal.imageUri) ? (
                                    <View style={styles.previewContainer}>
                                        <Image
                                            source={{ uri: selectedImageUri || latestMeal?.imageUri }}
                                            style={styles.previewImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.changeImageBadge}>
                                            <Plus size={16} color="white" />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Plus size={24} color="#94A3B8" />
                                        <Text style={styles.placeholderText}>研究写真を選択</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {latestMeal ? (
                                <View style={styles.previewCard}>
                                    <View style={styles.previewHeader}>
                                        <Microscope size={16} color="#1E88E5" />
                                        <Text style={styles.previewMealName}>{latestMeal.name || latestMeal.mealName}</Text>
                                    </View>
                                    <View style={styles.previewStats}>
                                        <Text style={styles.previewStatText}>{latestMeal.calories} kcal</Text>
                                        <Text style={styles.previewPFC}>P:{latestMeal.protein} F:{latestMeal.fat} C:{latestMeal.carbs}</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={[styles.previewCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                                    <Text style={[styles.previewMealName, { color: '#DC2626', textAlign: 'center' }]}>解析データが見つかりません</Text>
                                </View>
                            )}

                            <Text style={styles.inputLabel}>ダイエット手法</Text>
                            <TouchableOpacity
                                style={styles.methodSelector}
                                onPress={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                            >
                                <Text style={styles.methodSelectorText}>{getDietMethodLabel(selectedMethod)}</Text>
                                <ChevronDown size={20} color="#64748B" />
                            </TouchableOpacity>

                            {isMethodDropdownOpen && (
                                <View style={styles.dropdownList}>
                                    {DIET_METHODS.map((method) => (
                                        <TouchableOpacity
                                            key={method.id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedMethod(method.id);
                                                setIsMethodDropdownOpen(false);
                                            }}
                                        >
                                            <View style={[styles.colorDot, { backgroundColor: method.color }]} />
                                            <Text style={styles.dropdownItemText}>{method.label}</Text>
                                            {selectedMethod === method.id && <Check size={16} color="#1E88E5" />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setIsRecommended(!isRecommended)}
                            >
                                <View style={[styles.checkbox, isRecommended && styles.checkboxActive]}>
                                    {isRecommended && <Check size={14} color="#FFFFFF" />}
                                </View>
                                <Text style={styles.checkboxLabel}>この組み合わせをおすすめする</Text>
                            </TouchableOpacity>

                            <Text style={styles.inputLabel}>検証メモ</Text>
                            <TextInput
                                style={styles.memoInput}
                                placeholder="例：今日は塩分を控えたメニューです。PFCバランスも良好。"
                                multiline
                                numberOfLines={4}
                                value={postComment}
                                onChangeText={setPostComment}
                            />

                            <TouchableOpacity
                                style={[styles.uploadButton, (!latestMeal || isUploading) && styles.uploadButtonDisabled]}
                                onPress={handleUploadPost}
                                disabled={!latestMeal || isUploading}
                            >
                                {isUploading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                        <Text style={styles.uploadButtonText}>研究データを同期中...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.loadingContainer}>
                                        <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.uploadButtonText}>報告をパブリッシュ</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelLink}
                                onPress={() => setIsPostModalVisible(false)}
                            >
                                <Text style={styles.cancelText}>キャンセル</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!selectedPost}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedPost(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedPost && (
                                <>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>{selectedPost.mealName}</Text>
                                        <TouchableOpacity onPress={() => setSelectedPost(null)}>
                                            <Text style={styles.closeBtn}>閉じる</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.modalStatsCard}>
                                        <Text style={styles.modalStatTitle}>微量栄養素の精密解析</Text>
                                        <BarChart
                                            data={{
                                                labels: selectedPost.nutrientsDetail.map(n => n.label),
                                                datasets: [{
                                                    data: selectedPost.nutrientsDetail.map(n => Math.round((n.value / (n.goal || 100)) * 100))
                                                }]
                                            }}
                                            width={screenWidth - 80}
                                            height={220}
                                            yAxisLabel=""
                                            yAxisSuffix="%"
                                            chartConfig={chartConfig}
                                            fromZero
                                            style={{ marginVertical: 8, borderRadius: 16 }}
                                            showValuesOnTopOfBars
                                        />
                                    </View>

                                    <View style={styles.nutrientList}>
                                        {selectedPost.nutrientsDetail.map((n, i) => (
                                            <View key={i} style={styles.nutrientRow}>
                                                <Text style={styles.nutrientLabel}>{n.label}</Text>
                                                <View style={styles.nutrientRight}>
                                                    <Text style={styles.nutrientValue}>{n.value}{n.unit}</Text>
                                                    {n.goal && (
                                                        <Text style={styles.nutrientGoal}>/ {n.goal}{n.unit}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.memoSection}>
                                        <View style={styles.memoHeader}>
                                            <Info size={16} color="#1E88E5" />
                                            <Text style={styles.memoTitle}>検証メモ</Text>
                                        </View>
                                        <Text style={styles.fullMemo}>{selectedPost.memo}</Text>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    statsCarousel: { backgroundColor: '#1E88E5', paddingVertical: 8 },
    statsScroll: { paddingHorizontal: 20 },
    statsText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginRight: 30 },
    scrollContent: { paddingBottom: 20 },
    header: { padding: 20, backgroundColor: '#F8FAFC' },
    title: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
    subtitle: { fontSize: 14, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    searchWrapper: { backgroundColor: '#F8FAFC', paddingBottom: 15 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', height: 50 },
    searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: '#0F172A' },
    filterButton: { padding: 12 },
    categoriesScroll: { paddingHorizontal: 20, marginBottom: 5 },
    categoryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: '#FFFFFF', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    categoryBtnActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    categoryText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    categoryTextActive: { color: '#FFFFFF' },
    feedContainer: { paddingHorizontal: 20, marginTop: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
    postCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#1E88E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    featuredCard: { borderColor: '#1E88E5', borderWidth: 2, backgroundColor: '#F0F9FF', marginTop: 15 },
    featuredBadge: { position: 'absolute', top: -12, left: 20, backgroundColor: '#1E88E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 20 },
    featuredBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    researchIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
    userName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    postDate: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    caloriesBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    caloriesText: { fontSize: 12, fontWeight: '700', color: '#475569' },
    mealName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 15 },
    pfcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    pfcItem: { flex: 1, alignItems: 'center' },
    pfcLabel: { fontSize: 12, fontWeight: '900', marginBottom: 4 },
    pfcBarContainer: { width: '80%', height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginBottom: 6 },
    pfcBar: { height: '100%', borderRadius: 2 },
    pfcValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    postImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 15 },
    featuredImage: { height: 260 },
    memoText: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 15 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tagBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' },
    tagText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', padding: 24 },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', flex: 1 },
    closeBtn: { color: '#1E88E5', fontWeight: '800', fontSize: 15 },
    modalStatsCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 15, alignItems: 'center', marginBottom: 20 },
    modalStatTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
    nutrientList: { marginBottom: 25 },
    nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    nutrientLabel: { fontSize: 15, fontWeight: '700', color: '#475569' },
    nutrientRight: { flexDirection: 'row', alignItems: 'center' },
    nutrientValue: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    nutrientGoal: { fontSize: 13, color: '#94A3B8', marginLeft: 4 },
    memoSection: { backgroundColor: '#F0F9FF', padding: 20, borderRadius: 20 },
    memoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    memoTitle: { fontSize: 14, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase' },
    fullMemo: { fontSize: 15, color: '#1E40AF', lineHeight: 24 },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#1E88E5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    modalSubTitle: { fontSize: 16, color: '#475569', marginBottom: 20, fontWeight: '600' },
    previewCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 25 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    previewMealName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    previewImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 12 },
    previewStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewStatText: { fontSize: 15, fontWeight: '700', color: '#1E88E5' },
    previewPFC: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    inputLabel: { fontSize: 14, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    memoInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 25
    },
    uploadButton: {
        backgroundColor: '#1E88E5',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    uploadButtonDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
    uploadButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    loadingContainer: { flexDirection: 'row', alignItems: 'center' },
    cancelLink: { marginTop: 20, alignItems: 'center' },
    cancelText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
    methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    methodText: { fontSize: 12, fontWeight: '700' },
    recommendedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    recommendedText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
    methodSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },
    methodSelectorText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    dropdownList: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: -10, marginBottom: 20, padding: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    dropdownItemText: { fontSize: 14, color: '#334155', flex: 1, fontWeight: '500' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: '#FFFFFF' },
    checkboxActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    checkboxLabel: { fontSize: 15, color: '#475569', fontWeight: '600' },
    bookmarkButton: { zIndex: 10 },
    bookmarkIcon: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center'
    },
    bookmarkIconActive: {
        backgroundColor: '#1E88E5',
    },
    socialRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 15 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    socialText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    imageSelector: { width: '100%', height: 200, backgroundColor: '#F1F5F9', borderRadius: 24, marginBottom: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1' },
    previewContainer: { width: '100%', height: '100%', position: 'relative' },
    changeImageBadge: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },
    imagePlaceholder: { alignItems: 'center' },
    placeholderText: { fontSize: 13, color: '#94A3B8', fontWeight: '700', marginTop: 8 },
});

export default CommunityScreen;
