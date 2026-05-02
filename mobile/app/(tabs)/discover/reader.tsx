import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, BackHandler, Linking,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';

// Google Docs gview renders PDFs natively in WebView — no external app needed.
const GDOCS = (url: string) =>
    `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

// Desktop Chrome UA so servers like kalamullah.com don't block the request.
const DESKTOP_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export default function ReaderScreen() {
    const { url, title, author } = useLocalSearchParams<{
        url: string;
        title: string;
        author: string;
    }>();
    const router  = useRouter();
    const insets  = useSafeAreaInsets();
    const { theme } = useTheme();

    const [progress,    setProgress]    = useState(0);
    const [loading,     setLoading]     = useState(true);
    const [errored,     setErrored]     = useState(false);
    const [reloadKey,   setReloadKey]   = useState(0);
    const webViewRef = useRef<WebView>(null);
    const [canGoBack,   setCanGoBack]   = useState(false);

    const isPdf = (url ?? '').toLowerCase().includes('.pdf');
    // iOS WKWebView renders PDFs natively — no wrapper needed.
    // Android WebView does not; use Google Docs gview as fallback.
    const resolvedUrl = (isPdf && Platform.OS === 'android') ? GDOCS(url ?? '') : (url ?? '');

    const goBack = useCallback(() => {
        if (canGoBack && webViewRef.current) {
            webViewRef.current.goBack();
        } else {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/discover/articles' as any);
        }
    }, [canGoBack, router]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                goBack();
                return true;
            });
            return () => sub.remove();
        }, [goBack])
    );

    const onNavChange = (nav: WebViewNavigation) => {
        setCanGoBack(nav.canGoBack);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.bgCard }]}>
                <TouchableOpacity
                    onPress={goBack}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="chevron-left" size={26} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {title ?? 'Reader'}
                    </Text>
                    {!!author && (
                        <Text style={[styles.headerAuthor, { color: theme.gold }]} numberOfLines={1}>
                            {author}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.reloadBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => { setErrored(false); setLoading(true); setReloadKey(k => k + 1); }}
                    accessibilityRole="button"
                    accessibilityLabel="Reload document"
                >
                    <Feather name="refresh-cw" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Progress bar */}
            {loading && !errored && (
                <View style={[styles.progressBar, { backgroundColor: theme.bgInput }]}>
                    <View
                        style={[
                            styles.progressFill,
                            { backgroundColor: theme.gold, width: `${Math.max(progress * 100, 8)}%` as any },
                        ]}
                    />
                </View>
            )}

            {/* Error state */}
            {errored ? (
                <View style={styles.errorState}>
                    <Feather name="alert-circle" size={44} color={theme.textSecondary} />
                    <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Failed to load</Text>
                    <Text style={[styles.errorSub, { color: theme.textSecondary }]}>
                        The document could not be displayed in-app.
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.gold }]}
                        onPress={() => { setErrored(false); setLoading(true); setReloadKey(k => k + 1); }}
                        accessibilityRole="button"
                        accessibilityLabel="Retry loading"
                    >
                        <Text style={[styles.retryBtnText, { color: theme.textInverse }]}>Retry</Text>
                    </TouchableOpacity>
                    {!!url && (
                        <TouchableOpacity
                            style={[styles.openBrowserBtn, { borderColor: theme.border }]}
                            onPress={() => Linking.openURL(url)}
                            accessibilityRole="link"
                            accessibilityLabel="Open in browser"
                        >
                            <Feather name="external-link" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.openBrowserText, { color: theme.textSecondary }]}>Open in Browser</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <>
                    {loading && (
                        <View style={styles.loadingOverlay} pointerEvents="none">
                            <ActivityIndicator size="large" color={theme.gold} />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                                Loading document…
                            </Text>
                        </View>
                    )}
                    <WebView
                        key={reloadKey}
                        ref={webViewRef}
                        source={{ uri: resolvedUrl, headers: { 'User-Agent': DESKTOP_UA } }}
                        style={styles.webview}
                        userAgent={DESKTOP_UA}
                        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
                        onLoadEnd={() => setLoading(false)}
                        onError={() => { setLoading(false); setErrored(true); }}
                        onHttpError={({ nativeEvent }) => {
                            // 404/403/5xx → show error; 3xx redirects are fine
                            if (nativeEvent.statusCode >= 400) {
                                setLoading(false);
                                setErrored(true);
                            }
                        }}
                        onNavigationStateChange={onNavChange}
                        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState={false}
                        scalesPageToFit={Platform.OS === 'android'}
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        originWhitelist={['*']}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1 },
    header:          {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 56,
        borderBottomWidth: 1,
    },
    backBtn:         { width: 36, alignItems: 'flex-start' },
    headerCenter:    { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    headerTitle:     { fontSize: 16, fontWeight: '600' },
    headerAuthor:    { fontSize: 11, marginTop: 1 },
    reloadBtn:       { width: 36, alignItems: 'flex-end' },

    progressBar:     { height: 3 },
    progressFill:    { height: 3, borderRadius: 2 },

    webview:         { flex: 1 },

    loadingOverlay:  {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center', gap: 14,
        zIndex: 10,
    },
    loadingText:     { fontSize: 14 },

    errorState:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    errorTitle:      { fontSize: 18, fontWeight: '600' },
    errorSub:        { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    retryBtn:        { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
    retryBtnText:    { fontWeight: '600', fontSize: 15 },
    openBrowserBtn:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 4 },
    openBrowserText: { fontSize: 14 },
});
