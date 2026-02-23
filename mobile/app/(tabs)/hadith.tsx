import { View, Text, StyleSheet } from 'react-native';

export default function HadithScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Hadith Library</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#E8E6E1',
        fontSize: 24,
        fontWeight: 'bold',
    },
});
