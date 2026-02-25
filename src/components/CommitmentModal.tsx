import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CommitmentModalProps {
    visible: boolean;
    streakCount: number;
    onCommit: () => void;
    onClose: () => void;
}

export const CommitmentModal = ({ visible, streakCount, onCommit, onClose }: CommitmentModalProps) => {
    const [committed, setCommitted] = useState(false);

    useEffect(() => {
        if (visible) setCommitted(false);
    }, [visible]);

    const handleCommit = () => {
        setCommitted(true);
        setTimeout(() => {
            onCommit();
        }, 2000);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring' }}
                    style={styles.container}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="trophy" size={80} color="#FFD700" />
                        <MotiView
                            from={{ rotate: '0deg' }}
                            animate={{ rotate: '360deg' }}
                            transition={{ loop: true, duration: 4000, type: 'timing' }}
                            style={styles.starCircle}
                        >
                            <Ionicons name="star" size={24} color="#FFD700" style={styles.miniStar} />
                        </MotiView>
                    </View>

                    <Text style={styles.title}>{streakCount}日間達成！</Text>
                    <Text style={styles.message}>
                        素晴らしい研究の継続ですね。{"\n"}
                        あなたの努力がラボの成果に繋がっています。{"\n"}
                        次の目標に向けて、改めて継続をコミットしますか？
                    </Text>

                    {!committed ? (
                        <TouchableOpacity style={styles.commitButton} onPress={handleCommit}>
                            <Text style={styles.commitButtonText}>コミットする</Text>
                        </TouchableOpacity>
                    ) : (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            style={styles.successContainer}
                        >
                            <Ionicons name="sparkles" size={40} color="#FFD700" />
                            <Text style={styles.successText}>コミット完了！</Text>
                        </MotiView>
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>閉じる</Text>
                    </TouchableOpacity>
                </MotiView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        position: 'relative',
    },
    starCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        top: -20,
        left: -20,
        alignItems: 'center',
    },
    miniStar: {
        position: 'absolute',
        top: 0,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E88E5',
        marginBottom: 15,
    },
    message: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    commitButton: {
        backgroundColor: '#1E88E5',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#1E88E5',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
    },
    commitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    successContainer: {
        alignItems: 'center',
    },
    successText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#34C759',
        marginTop: 10,
    },
    closeButton: {
        marginTop: 20,
    },
    closeButtonText: {
        color: '#94A3B8',
        fontSize: 14,
    }
});
