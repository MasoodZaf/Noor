import { sanitizeArabicText } from '../utils/arabic';

describe('sanitizeArabicText', () => {
    it('returns empty string for empty input', () => {
        expect(sanitizeArabicText('')).toBe('');
    });

    it('leaves clean Arabic text untouched', () => {
        const text = 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
        expect(sanitizeArabicText(text)).toBe(text);
    });

    it('strips Uthmani recitation marks U+06D6–U+06DC', () => {
        // U+06D6 (Small High Ligature Sad), U+06D8 (Small High Meem)
        const input = 'بِسْمِۖ ٱللَّٰهِۘ';
        expect(sanitizeArabicText(input)).toBe('بِسْمِ ٱللَّٰهِ');
    });

    it('strips marks in U+06DF–U+06E8 range', () => {
        // U+06E5 (Small Waw — caused 97:2 stray glyph bug)
        const input = 'كَيْفَۥ شِئْتَ';
        expect(sanitizeArabicText(input)).toBe('كَيْفَ شِئْتَ');
    });

    it('strips marks in U+06EA–U+06ED range', () => {
        const input = 'مَا۫ كَانَۭ';
        expect(sanitizeArabicText(input)).toBe('مَا كَانَ');
    });

    it('preserves U+06DD (end-of-ayah ornament ۝)', () => {
        const input = 'ٱلرَّحِيمِ ۝';
        expect(sanitizeArabicText(input)).toBe('ٱلرَّحِيمِ ۝');
    });

    it('preserves U+06E9 (sajdah marker ۩)', () => {
        const input = 'وَٱسْجُدْ ۩';
        expect(sanitizeArabicText(input)).toBe('وَٱسْجُدْ ۩');
    });

    it('handles multiple marks scattered through a long verse', () => {
        const input = 'وَإِذْۖ قَالَۗ رَبُّكَۚ لِلْمَلَٰٓئِكَةِۜ';
        expect(sanitizeArabicText(input)).toBe('وَإِذْ قَالَ رَبُّكَ لِلْمَلَٰٓئِكَةِ');
    });

    it('does not strip Latin letters or punctuation', () => {
        expect(sanitizeArabicText('Bismillah, in the name of Allah.')).toBe('Bismillah, in the name of Allah.');
    });
});
