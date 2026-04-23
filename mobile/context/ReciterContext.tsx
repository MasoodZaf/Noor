import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Quran.com recitation IDs — mirrored in quran/[id].tsx so both stay in sync.
// Keep only the IDs the global Tweaks picker exposes. Full list still lives
// in the Quran reader for power-user selection.
export type ReciterId = 1 | 3 | 5 | 7;
export type Reciter = {
    id: ReciterId;
    name: string;
    label: string;
    country: string;
};

export const RECITERS: Reciter[] = [
    { id: 7, name: 'Mishary Al-Afasy',       label: 'Al-ʿAfāsy',         country: 'Kuwait 🇰🇼' },
    { id: 1, name: 'Abdul Basit Abd Samad',  label: 'Abdul Basit',        country: 'Egypt 🇪🇬' },
    { id: 3, name: 'Abdur-Rahman Al-Sudais', label: 'As-Sudais',          country: 'Saudi Arabia 🇸🇦' },
    { id: 5, name: 'Abu Bakr Al-Shatri',     label: 'Al-Shatri',          country: 'Saudi Arabia 🇸🇦' },
];

const STORAGE_KEY = '@noor/reciter';

interface ReciterContextType {
    reciter: Reciter;
    setReciter: (r: Reciter) => void;
}

const ReciterContext = createContext<ReciterContextType>({
    reciter: RECITERS[0],
    setReciter: () => {},
});

export const useReciter = () => useContext(ReciterContext);

export const ReciterProvider = ({ children }: { children: React.ReactNode }) => {
    const [reciter, setReciterState] = useState<Reciter>(RECITERS[0]);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(raw => {
            if (!raw) return;
            const id = parseInt(raw, 10);
            const match = RECITERS.find(r => r.id === id);
            if (match) setReciterState(match);
        }).catch(() => {});
    }, []);

    const setReciter = (r: Reciter) => {
        setReciterState(r);
        AsyncStorage.setItem(STORAGE_KEY, String(r.id)).catch(() => {});
    };

    return (
        <ReciterContext.Provider value={{ reciter, setReciter }}>
            {children}
        </ReciterContext.Provider>
    );
};
