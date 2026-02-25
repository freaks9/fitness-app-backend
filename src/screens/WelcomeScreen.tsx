
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import {
    Dimensions,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Design System Constants (matching the Onboarding screen, but darker for video focus)
const COLORS = {
    background: '#0F172A', // Deep Navy Black
    primary: '#1E88E5',    // Smart Blue
    text: '#FFFFFF',       // White for readability over video
    textSecondary: '#CBD5E1', // Light Gray-Blue
    white: '#FFFFFF',
};

const WelcomeScreen = ({ navigation }: any) => {
    const videoRef = useRef<Video>(null);

    const handleStart = () => {
        navigation.navigate('Onboarding');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 1. Background Video Layer */}
            <View style={StyleSheet.absoluteFillObject}>
                <Video
                    ref={videoRef}
                    source={require('../../assets/videos/ai_coach_video.mp4')}
                    style={styles.backgroundVideo}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    isMuted
                    shouldPlay
                />

                {/* 2. Sophisticated Gradient Overlays */}
                {/* Top Overlay for a bit of subtle vignette */}
                <LinearGradient
                    colors={['rgba(15, 23, 42, 0.4)', 'rgba(0, 0, 0, 0)']}
                    style={[styles.absolute, { height: '20%' }]}
                />

                {/* Main Bottom Overlay: Fades video into background color #0F172A */}
                <LinearGradient
                    colors={['rgba(0, 0, 0, 0)', 'rgba(15, 23, 42, 0.8)', COLORS.background]}
                    style={[styles.absolute, { height: '60%', bottom: 0 }]}
                />
            </View>

            {/* 3. Content Layer (Foreground) */}
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>

                    {/* Science/Tech Glow Element */}
                    <View style={styles.glowContainer}>
                        <LinearGradient
                            colors={['rgba(30, 136, 229, 0.2)', 'rgba(0, 0, 0, 0)']}
                            style={styles.glowCircle}
                        />
                        <Ionicons name="fitness-outline" size={32} color={COLORS.primary} />
                    </View>

                    {/* Main Catchphrase */}
                    <Text style={styles.title}>
                        AIが、あなたの{"\n"}専属トレーナーになる。
                    </Text>

                    {/* Lead Text */}
                    <Text style={styles.description}>
                        最新の画像解析AIが、毎日の食事を瞬時にデータ化。科学的なアプローチで、理想のカラダ作りを最短距離でサポートします。まずは、あなたのことを教えてください。
                    </Text>

                    {/* Action Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={handleStart}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.startButtonText}>初期設定を始める</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    absolute: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    backgroundVideo: {
        width: width,
        height: height * 0.7, // Video occupies a large portion of the screen
    },
    safeArea: {
        flex: 1,
        justifyContent: 'flex-end', // Push content to the bottom
    },
    content: {
        paddingHorizontal: 32,
        paddingBottom: 50,
        alignItems: 'center',
    },
    glowContainer: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    glowCircle: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 44,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 48,
        fontWeight: '500',
    },
    footer: {
        width: '100%',
    },
    startButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 20,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    startButtonText: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 1,
    },
});

export default WelcomeScreen;
