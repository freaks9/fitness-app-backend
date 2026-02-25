import { Microscope } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Easing } from 'react-native-reanimated';

// width is not used

interface SyncLoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export const SyncLoadingOverlay: React.FC<SyncLoadingOverlayProps> = ({
    visible,
    message = "研究データを同期中..."
}) => {
    if (!visible) return null;

    return (
        <View style={styles.container}>
            <MotiView
                from={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                style={styles.content}
            >
                <MotiView
                    animate={{
                        rotate: '360deg',
                    }}
                    transition={{
                        type: 'timing',
                        duration: 3000,
                        loop: true,
                        repeatReverse: false,
                        easing: Easing.linear,
                    }}
                    style={styles.iconContainer}
                >
                    <Microscope size={40} color="#1E88E5" />
                </MotiView>

                <MotiView
                    from={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        type: 'timing',
                        duration: 1000,
                        loop: true,
                    }}
                >
                    <Text style={styles.messageText}>{message}</Text>
                </MotiView>

                <View style={styles.progressTrack}>
                    <MotiView
                        from={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{
                            type: 'timing',
                            duration: 2000,
                            loop: true,
                            repeatReverse: false,
                        }}
                        style={styles.progressBar}
                    />
                </View>
            </MotiView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(248, 250, 252, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    content: {
        alignItems: 'center',
        padding: 30,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E6F4FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    messageText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: 0.5,
        marginBottom: 20,
    },
    progressTrack: {
        width: 180,
        height: 4,
        backgroundColor: '#F1F5F9',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#1E88E5',
    },
});
