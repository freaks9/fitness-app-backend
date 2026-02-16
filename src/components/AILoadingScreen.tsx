import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useLanguageContext } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const FloatingIcon = ({ text, color, delay }: { text: string; color: string; delay: number }) => {
    return (
        <MotiView
            from={{ translateY: 0, translateX: 0, opacity: 0, scale: 0.5 }}
            animate={{
                translateY: [0, -100, -200, -300],
                translateX: [0, 20, -20, 10],
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.8]
            }}
            transition={{
                type: 'timing',
                duration: 4000,
                delay,
                loop: true,
                repeatReverse: false,
            }}
            style={[styles.floatingIcon, { backgroundColor: color }]}
        >
            <Text style={styles.floatingIconText}>{text}</Text>
        </MotiView>
    );
};

export const AILoadingScreen = ({ visible }: { visible: boolean }) => {
    const { t } = useLanguageContext();
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = [
        t('analyzing') || "Analyzing image...",
        t('analyzingLabel') || "Reading nutrition label...",
        "Identifying food items...",
        "Calculating protein content...",
        "Estimating caloric density...",
        "Almost there!",
    ];

    useEffect(() => {
        if (visible) {
            const interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % messages.length);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [visible, messages.length]);

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.animationContainer}>
                <FloatingIcon text="P" color="#FF9500" delay={0} />
                <FloatingIcon text="F" color="#FF2D55" delay={1000} />
                <FloatingIcon text="C" color="#34C759" delay={2000} />
                <FloatingIcon text="Kcal" color="#5856D6" delay={3000} />
            </View>

            <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={messageIndex}
                transition={{ type: 'timing', duration: 500 }}
                style={styles.messageContainer}
            >
                <Text style={styles.messageText}>{messages[messageIndex]}</Text>
            </MotiView>

            <View style={styles.progressContainer}>
                <MotiView
                    from={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ type: 'timing', duration: 15000 }}
                    style={styles.progressBar}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    animationContainer: {
        width: '100%',
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingIcon: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    floatingIconText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    messageContainer: {
        marginTop: 40,
        paddingHorizontal: 20,
    },
    messageText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    progressContainer: {
        width: width * 0.7,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        marginTop: 30,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
});
