import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, ImageProps, ImageSourcePropType, ImageURISource, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * CachedImage — wraps RN Image with a filesystem cache for remote URLs.
 *
 * Hits a stable file path under cacheDirectory derived from the URL hash so
 * the same URL always resolves to the same file. First load downloads, all
 * subsequent loads read from disk. Local require() sources pass straight
 * through — no caching needed for those.
 */

const CACHE_DIR = `${FileSystem.cacheDirectory}image-cache/`;
let dirEnsured = false;

const ensureDir = async () => {
    if (dirEnsured) return;
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    dirEnsured = true;
};

// Tiny non-cryptographic hash for filename generation. Collision chance for our
// usage (hundreds of distinct URLs) is negligible. Avoids a crypto dependency.
const hash = (s: string): string => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return (h >>> 0).toString(36);
};

const cachePathFor = (url: string): string => {
    const ext = url.match(/\.(png|jpe?g|webp|gif|avif)(\?|$)/i)?.[1]?.toLowerCase() || 'jpg';
    return `${CACHE_DIR}${hash(url)}.${ext}`;
};

interface Props extends Omit<ImageProps, 'source'> {
    source: ImageSourcePropType;
    showLoader?: boolean;
    loaderColor?: string;
}

const CachedImage: React.FC<Props> = ({ source, showLoader, loaderColor = '#999', style, ...rest }) => {
    const isRemote = typeof source === 'object' && source !== null && !Array.isArray(source) && 'uri' in source && typeof (source as ImageURISource).uri === 'string' && /^https?:\/\//.test((source as ImageURISource).uri!);
    const remoteUri = isRemote ? (source as ImageURISource).uri! : null;

    const [resolved, setResolved] = useState<string | null>(null);
    const [loading, setLoading] = useState(isRemote);
    const mountedRef = useRef(true);

    useEffect(() => () => { mountedRef.current = false; }, []);

    useEffect(() => {
        if (!remoteUri) { setResolved(null); setLoading(false); return; }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                await ensureDir();
                const target = cachePathFor(remoteUri);
                const info = await FileSystem.getInfoAsync(target);
                if (info.exists) {
                    if (!cancelled && mountedRef.current) {
                        setResolved(target);
                        setLoading(false);
                    }
                    return;
                }
                const dl = await FileSystem.downloadAsync(remoteUri, target);
                if (!cancelled && mountedRef.current) {
                    setResolved(dl.uri);
                    setLoading(false);
                }
            } catch (e) {
                if (__DEV__) console.warn('[Noor/CachedImage] cache failed, falling back to network:', e);
                if (!cancelled && mountedRef.current) {
                    setResolved(remoteUri); // fall back to direct stream
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [remoteUri]);

    if (!isRemote) return <Image source={source} style={style} {...rest} />;

    if (loading && showLoader) {
        return (
            <View style={[styles.loaderWrap, style]}>
                <ActivityIndicator color={loaderColor} />
            </View>
        );
    }

    if (!resolved) return <View style={style} />;

    return <Image source={{ uri: resolved }} style={style} {...rest} />;
};

const styles = StyleSheet.create({
    loaderWrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
});

/**
 * useCachedImageUri — hook variant of CachedImage. Resolves a remote URL to a
 * local cached file path; returns the original URL while loading or on cache
 * failure. Use when you need to wrap with `ImageBackground` (which doesn't
 * accept a custom Image component).
 */
export const useCachedImageUri = (remoteUri: string | null | undefined): string | null => {
    const [resolved, setResolved] = useState<string | null>(remoteUri ?? null);
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    useEffect(() => {
        if (!remoteUri || !/^https?:\/\//.test(remoteUri)) {
            setResolved(remoteUri ?? null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                await ensureDir();
                const target = cachePathFor(remoteUri);
                const info = await FileSystem.getInfoAsync(target);
                if (info.exists) {
                    if (!cancelled && mountedRef.current) setResolved(target);
                    return;
                }
                const dl = await FileSystem.downloadAsync(remoteUri, target);
                if (!cancelled && mountedRef.current) setResolved(dl.uri);
            } catch {
                if (!cancelled && mountedRef.current) setResolved(remoteUri); // network fallback
            }
        })();
        return () => { cancelled = true; };
    }, [remoteUri]);

    return resolved;
};

export default React.memo(CachedImage);
