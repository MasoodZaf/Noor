import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@noor_local_user_id';

// Returns a stable local user ID persisted across app installs via AsyncStorage.
// If Supabase session is active, callers can override with session.user.id.
let cachedUserId: string | null = null;

export const getLocalUserId = async (): Promise<string> => {
    if (cachedUserId) return cachedUserId;
    try {
        const stored = await AsyncStorage.getItem(USER_ID_KEY);
        if (stored) {
            cachedUserId = stored;
            return stored;
        }
        // Generate a simple unique ID
        const newId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem(USER_ID_KEY, newId);
        cachedUserId = newId;
        return newId;
    } catch {
        return 'local_user';
    }
};
