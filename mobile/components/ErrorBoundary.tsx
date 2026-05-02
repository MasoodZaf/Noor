import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        if (__DEV__) {
            console.error('[Noor/ErrorBoundary]', error, info.componentStack);
        }
    }

    reset = () => this.setState({ error: null });

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        Falah hit an unexpected error. Tap below to recover — your local data is unaffected.
                    </Text>
                    {__DEV__ && (
                        <Text style={styles.devError} selectable>
                            {this.state.error.name}: {this.state.error.message}
                            {'\n\n'}
                            {this.state.error.stack?.slice(0, 600)}
                        </Text>
                    )}
                    <TouchableOpacity
                        onPress={this.reset}
                        style={styles.button}
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                    >
                        <Text style={styles.buttonText}>Try again</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A1F1B' },
    content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    title: { color: '#E8E6E1', fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    subtitle: { color: '#8A8F87', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
    devError: { color: '#E53E3E', fontSize: 11, fontFamily: 'Menlo', marginBottom: 24, padding: 12, backgroundColor: 'rgba(229,62,62,0.08)', borderRadius: 8 },
    button: { backgroundColor: '#C9A84C', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
    buttonText: { color: '#1A1F1B', fontSize: 15, fontWeight: '700' },
});
