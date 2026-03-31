/**
 * Strip Uthmani-specific recitation annotation marks from Arabic text before display.
 *
 * Characters in U+06D6–U+06DC and U+06DF–U+06E8, U+06EA–U+06ED are pause/stop/annotation
 * signs used in Uthmani script manuscripts. Fonts like ScheherazadeNew and NotoNaskhArabic
 * may not have correct glyphs for all of them, causing them to appear as stray boxes,
 * floating circles/loops, or misplaced diacritics (e.g. small waw U+06E5 in 97:2).
 *
 * U+06DD (۝ end-of-ayah ornament) and U+06E9 (۩ sajdah marker) are intentionally kept.
 */
export const sanitizeArabicText = (text: string): string =>
    text.replace(/[\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
