import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function QuranScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Top Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <Text style={styles.surahTitle}>Surah Al-Fatiha</Text>
                <View style={{ width: 24 }} /> {/* Spacer for centering */}
            </View>

            {/* Main Content Area */}
            <View style={styles.contentArea}>
                {/* Arabic Verse */}
                <Text style={styles.arabicText}>بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>

                {/* Pronunciation/Translation separator (Optional aesthetic spacing) */}
                <View style={{ height: 40 }} />

                {/* English Translation */}
                <Text style={styles.englishText}>
                    In the name of Allah, the Entirely Merciful, the Especially Merciful.
                </Text>
            </View>

            {/* Glassmorphic Audio Player floating above tab bar */}
            <View style={[styles.audioPlayerContainer, { marginBottom: 20 }]}>
                <View style={styles.audioPlayerPanel}>
                    <TouchableOpacity style={styles.playButton}>
                        <Feather name="play" size={20} color="#C9A84C" />
                    </TouchableOpacity>

                    <View style={styles.progressTrack}>
                        <View style={styles.progressFill} />
                        <View style={styles.progressThumb} />
                    </View>

                    <View style={styles.reciterInfo}>
                        <Text style={styles.reciterName}>Mishary Al-Afasy</Text>
                    </View>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 40,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    surahTitle: {
        color: '#C9A84C', // Premium Gold
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    contentArea: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
        marginTop: -80, // slightly up to center visually
    },
    arabicText: {
        color: '#C9A84C', // Gold text
        fontSize: 42,
        lineHeight: 70,
        textAlign: 'center',
        fontWeight: '400',
        fontFamily: Platform.OS === 'ios' ? 'Damascus' : 'serif', // Placeholder for Uthmani font
    },
    englishText: {
        color: '#9A9590', // Grey
        fontSize: 18,
        lineHeight: 28,
        textAlign: 'center',
        fontWeight: '400',
    },
    audioPlayerContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    audioPlayerPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 78, 61, 0.4)', // Forest green Glassmorphism
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)', // Faint gold border
        borderRadius: 30,
        paddingVertical: 14,
        paddingHorizontal: 20,
        width: '100%',
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(201, 168, 76, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressTrack: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16,
        borderRadius: 2,
        position: 'relative',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '35%', // dummy progress
        backgroundColor: '#C9A84C',
        borderRadius: 2,
    },
    progressThumb: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#C9A84C',
        position: 'absolute',
        left: '35%',
        marginLeft: -4,
    },
    reciterInfo: {
        alignItems: 'flex-end',
    },
    reciterName: {
        color: '#E8E6E1',
        fontSize: 12,
        fontWeight: '500',
    }
});
