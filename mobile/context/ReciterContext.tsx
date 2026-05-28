import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Quran.com recitation IDs — mirrored in quran/[id].tsx so both stay in sync.
// Keep only the IDs the global Tweaks picker exposes. Full list still lives
// in the Quran reader for power-user selection.
// IDs verified against api.quran.com/api/v4/resources/recitations:
//   2 = AbdulBaset (Murattal), 3 = Sudais, 4 = Shatri, 7 = Mishary
export type ReciterId = 2 | 3 | 4 | 7;
export type Reciter = {
    id: ReciterId;
    name: string;
    label: string;
    country: string;
};

export const RECITERS: Reciter[] = [
    { id: 7, name: 'Mishary Al-Afasy',       label: 'Al-ʿAfāsy',         country: 'Kuwait 🇰🇼' },
    { id: 2, name: 'Abdul Basit Abd Samad',  label: 'Abdul Basit',        country: 'Egypt 🇪🇬' },
    { id: 3, name: 'Abdur-Rahman Al-Sudais', label: 'As-Sudais',          country: 'Saudi Arabia 🇸🇦' },
    { id: 4, name: 'Abu Bakr Al-Shatri',     label: 'Al-Shatri',          country: 'Saudi Arabia 🇸🇦' },
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
            let id = parseInt(raw, 10);
            // Migrate legacy IDs from before reciter-ID correction: 1 (Mujawwad) → 2 (Murattal), 5 (Rifai) → 4 (Shatri)
            if (id === 1) id = 2;
            else if (id === 5) id = 4;
            const match = RECITERS.find(r => r.id === id);
            if (match) {
                setReciterState(match);
                if (String(match.id) !== raw) AsyncStorage.setItem(STORAGE_KEY, String(match.id)).catch(() => {});
            }
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
