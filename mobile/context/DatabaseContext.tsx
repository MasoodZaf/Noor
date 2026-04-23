import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

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
                const dbVersion = 'v20';
                const dbName = `noor_${dbVersion}.db`;
                // SQLite on Expo looks for dbs in the 'SQLite' folder of documentDirectory
                const dbDirectory = `${FileSystem.documentDirectory}SQLite/`;
                const dbFilePath = `${dbDirectory}${dbName}`;

                console.log(`[Database] Initializing version ${dbVersion}...`);
                const fileInfo = await FileSystem.getInfoAsync(dbFilePath);

                if (!fileInfo.exists) {
                    console.log(`[Database] ${dbName} not found. Preparing new copy...`);

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
                    console.log("[Database] Successfully copied master database to app storage.");
                } else {
                    console.log("[Database] Using existing offline vault at:", dbFilePath);
                }

                // In v15+, we specify the exact name
                const database = await SQLite.openDatabaseAsync(dbName);

                // Run a sanity check query
                const check = await database.getFirstAsync('SELECT count(*) as count FROM surahs') as any;
                const qCheck = await database.getFirstAsync('SELECT count(*) as count FROM qaida_lessons') as any;
                console.log("[Database] Sanity check:", check?.count || 0, "surahs and", qCheck?.count || 0, "qaida lessons");

                if (isMounted) {
                    setDb(database);
                    setIsReady(true);
                }
            } catch (error: any) {
                console.error("[Database] CRITICAL ERROR:", error);
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
            console.error("Sync failed:", error);
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
