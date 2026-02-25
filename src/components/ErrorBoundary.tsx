
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>申し訳ありません</Text>
                    <Text style={styles.subtitle}>アプリでエラーが発生しました。</Text>
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => this.setState({ hasError: false, error: null })}
                    >
                        <Text style={styles.buttonText}>再開する</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#EF4444', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#64748B', marginBottom: 20 },
    errorBox: { padding: 15, backgroundColor: '#F8FAFC', borderRadius: 8, width: '100%', marginBottom: 20 },
    errorText: { fontSize: 13, color: '#475569', fontFamily: 'monospace' },
    button: { paddingVertical: 12, paddingHorizontal: 30, backgroundColor: '#1E88E5', borderRadius: 25 },
    buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});

export default ErrorBoundary;
