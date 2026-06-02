import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Upgrade housekeeping ───────────────────────────────────────────────────────
// Derived caches written by a previous build can carry over across an app update
// (a fresh install wipes them, an update does not). A malformed cached value
// rendered on first paint — e.g. an over-long string fed into a single <Text> —
// can block the main thread long enough for iOS to watchdog-kill the app at
// launch (0x8BADF00D), which presents as an endless "loading" loop on update
// while fresh installs are fine. We purge these caches once per dbVersion.
//
// IMPORTANT: every prefix below is a CACHE that regenerates (API re-fetch or
// re-derivation). User data — bookmarks, settings, tasbih counts, hifz entries,
// reciter, language, Ramadan streak — is deliberately excluded and preserved.
const STALE_CACHE_PREFIXES = [
    '@noor/daily_aya_',   // Verse of the Day (renders Arabic on Home)
    '@noor/prayer_v2_',   // prayer-time cache
    '@noor/hijri_cal_',   // Hijri calendar cache
    '@noor/qibla_',       // Qibla bearing cache
    '@noor/geocode_',     // reverse-geocode cache
    '@ramadan_timings_',  // sehri/iftar cache
];
const CACHE_PURGE_MARKER = '@noor/cache_purged_for';

async function purgeStaleCachesOnUpgrade(version: string) {
    try {
        const marker = await AsyncStorage.getItem(CACHE_PURGE_MARKER);
        if (marker === version) return; // already purged for this version
        const keys = await AsyncStorage.getAllKeys();
        const stale = keys.filter(k => STALE_CACHE_PREFIXES.some(p => k.startsWith(p)));
        if (stale.length) await AsyncStorage.multiRemove(stale);
        await AsyncStorage.setItem(CACHE_PURGE_MARKER, version);
        if (__DEV__) console.log(`[Database] Upgrade purge (${version}): removed ${stale.length} stale cache key(s).`);
    } catch (e) {
        if (__DEV__) console.warn('[Database] Cache purge skipped:', e);
    }
}

// Remove orphaned DB copies from previous dbVersions so they don't leak ~59 MB
// of disk every time the bundled database is bumped.
async function cleanupOldDatabases(dbDirectory: string, currentDbName: string) {
    try {
        const entries = await FileSystem.readDirectoryAsync(dbDirectory);
        const orphans = entries.filter(f => f.startsWith('noor_') && f.endsWith('.db') && f !== currentDbName);
        for (const f of orphans) {
            // Drop the DB plus any SQLite sidecar files (-wal/-shm/-journal)
            for (const suffix of ['', '-wal', '-shm', '-journal']) {
                await FileSystem.deleteAsync(`${dbDirectory}${f}${suffix}`, { idempotent: true }).catch(() => {});
            }
        }
        if (__DEV__ && orphans.length) console.log(`[Database] Removed ${orphans.length} orphaned DB file(s).`);
    } catch (e) {
        if (__DEV__) console.warn('[Database] Old-DB cleanup skipped:', e);
    }
}

interface DatabaseContextType {
    db: SQLite.SQLiteDatabase | null;
    isReady: boolean;
    syncData: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
    db: null,
    isReady: false,
    syncData: async () => { },
});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }: { children: React.ReactNode }) => {
    const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const initDb = async () => {
            try {
                // Bumped v20 → v21: forces carried-over databases to be replaced with
                // the current clean copy on update (the copy only runs when the file is
                // absent, so the version string is what triggers a refresh).
                const dbVersion = 'v21';
                const dbName = `noor_${dbVersion}.db`;
                // SQLite on Expo looks for dbs in the 'SQLite' folder of documentDirectory
                const dbDirectory = `${FileSystem.documentDirectory}SQLite/`;
                const dbFilePath = `${dbDirectory}${dbName}`;

                if (__DEV__) console.log(`[Database] Initializing version ${dbVersion}...`);
                const fileInfo = await FileSystem.getInfoAsync(dbFilePath);

                if (!fileInfo.exists) {
                    if (__DEV__) console.log(`[Database] ${dbName} not found. Preparing new copy...`);

                    // Create directory if missing
                    const dirInfo = await FileSystem.getInfoAsync(dbDirectory);
                    if (!dirInfo.exists) {
                        await FileSystem.makeDirectoryAsync(dbDirectory, { intermediates: true });
                    }

                    // Get asset and copy it
                    // NOTE: 'noor.db' is the source filename in project assets
                    const asset = Asset.fromModule(require('../assets/noor.db'));
                    await asset.downloadAsync();

                    const source = asset.localUri || asset.uri;
                    if (!source) throw new Error("Asset source (localUri/uri) is null or undefined");

                    if (source.startsWith('http')) {
                        await FileSystem.downloadAsync(source, dbFilePath);
                    } else {
                        await FileSystem.copyAsync({
                            from: source,
                            to: dbFilePath
                        });
                    }
                    if (__DEV__) console.log("[Database] Successfully copied master database to app storage.");
                } else {
                    if (__DEV__) console.log("[Database] Using existing offline vault at:", dbFilePath);
                }

                // In v15+, we specify the exact name
                const database = await SQLite.openDatabaseAsync(dbName);

                // Run a sanity check query
                const check = await database.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM surahs');
                const qCheck = await database.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM qaida_lessons');
                if (__DEV__) console.log("[Database] Sanity check:", check?.count || 0, "surahs and", qCheck?.count || 0, "qaida lessons");

                // One-time upgrade housekeeping — runs before the UI mounts so no
                // screen can read a stale (and potentially malformed) cache on first
                // paint. Both are best-effort and never block readiness on failure.
                await purgeStaleCachesOnUpgrade(dbVersion);
                await cleanupOldDatabases(dbDirectory, dbName);

                if (isMounted) {
                    setDb(database);
                    setIsReady(true);
                }
            } catch (error: any) {
                if (__DEV__) console.error("[Database] CRITICAL ERROR:", error);
                if (isMounted) {
                    setErrorMsg(`Init Failure: ${error.message}`);
                }
            }
        };

        setTimeout(() => {
            initDb();
        }, 500); // Give the RN environment half a second to fully boot

        return () => {
            isMounted = false;
        };
    }, []);

    const syncData = async () => {
        if (!db) return;
        setIsSyncing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            if (__DEV__) console.error("[Database] Sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    if (errorMsg) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: '#E8E6E1', fontSize: 16, marginBottom: 10 }}>Failed to Initialize</Text>
                <Text style={{ color: '#E53E3E', textAlign: 'center', paddingHorizontal: 20 }}>{errorMsg}</Text>
            </View>
        );
    }

    if (!isReady) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.loadingText}>Initializing...</Text>
            </View>
        );
    }

    return (
        <DatabaseContext.Provider value={{ db, isReady, syncData }}>
            {children}
            {isSyncing && (
                <View style={styles.syncOverlay}>
                    <ActivityIndicator size="small" color="#C9A84C" />
                    <Text style={styles.syncText}>Syncing Data...</Text>
                </View>
            )}
        </DatabaseContext.Provider>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0C0F0E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#9A9590',
        marginTop: 16,
        fontSize: 14,
        letterSpacing: 0.5,
    },
    syncOverlay: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(31, 78, 61, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#C9A84C',
    },
    syncText: {
        color: '#E8E6E1',
        fontSize: 13,
        fontWeight: '500',
    }
});
