import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@noor/offline_mode';

interface NetworkModeContextType {
    isOfflineMode: boolean;
    setOfflineMode: (v: boolean) => void;
}

const NetworkModeContext = createContext<NetworkModeContextType>({
    isOfflineMode: false,
    setOfflineMode: () => {},
});

export const useNetworkMode = () => useContext(NetworkModeContext);

export const NetworkModeProvider = ({ children }: { children: React.ReactNode }) => {
    // Default is false (online) — offline mode must be explicitly enabled
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val === 'true') setIsOfflineMode(true);
        }).catch(() => {});
    }, []);

    const setOfflineMode = (v: boolean) => {
        setIsOfflineMode(v);
        AsyncStorage.setItem(STORAGE_KEY, v ? 'true' : 'false').catch(() => {});
    };

    return (
        <NetworkModeContext.Provider value={{ isOfflineMode, setOfflineMode }}>
            {children}
        </NetworkModeContext.Provider>
    );
};
