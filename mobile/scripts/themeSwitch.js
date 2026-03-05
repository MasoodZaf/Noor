const fs = require('fs');
const path = require('path');

const targetFiles = [
    'app/duas/[id].tsx',
    'app/(tabs)/qaida.tsx',
    'app/(tabs)/discover/recitation.tsx',
    'app/(tabs)/discover/index.tsx',
    'app/(tabs)/discover/ask.tsx',
    'app/(tabs)/discover/articles.tsx',
    'app/(tabs)/discover/ramadan.tsx',
    'app/(tabs)/discover/_layout.tsx',
    'app/(tabs)/discover/live.tsx',
    'app/(tabs)/discover/halal.tsx',
    'app/(tabs)/qibla.tsx',
    'app/(tabs)/quran/index.tsx',
    'app/(tabs)/quran/_layout.tsx',
    'app/(tabs)/quran/hifz/index.tsx',
    'app/(tabs)/hadith/index.tsx',
    'app/(tabs)/hadith/_layout.tsx',
    'app/(tabs)/hadith/[id].tsx',
    'app/(tabs)/profile.tsx',
    'app/(tabs)/index/calendar.tsx',
    'app/(tabs)/index/_layout.tsx',
    'app/_layout.tsx',
    'app/(tabs)/_layout.tsx'
];

targetFiles.forEach(filePaths => {
    const fullPath = path.join(__dirname, '..', filePaths);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');

    // Backgrounds
    content = content.replace(/#0C0F0E/gi, '#FDF8F0'); // Main background -> Cream

    // Semi-transparent white borders/cards -> Semi-transparent black/cream equivalents
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, '#FFFFFF'); // Card backgrounds
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'rgba(0,0,0,0.05)'); // Borders usually
    content = content.replace(/rgba\(255,255,255,0\.02\)/g, '#FFFFFF');
    content = content.replace(/rgba\(255,255,255,0\.05\)/g, 'rgba(0,0,0,0.05)');
    content = content.replace(/rgba\(255,255,255,0\.1\)/g, 'rgba(0,0,0,0.08)');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'rgba(0,0,0,0.08)');

    // Texts
    content = content.replace(/#E8E6E1/gi, '#1A1A1A'); // Primary Text (Off-white -> Dark Gray)
    content = content.replace(/#9A9590/gi, '#5E5C58'); // Secondary Text (Muted gray -> Dark muted gray)
    content = content.replace(/#9B9B9B/gi, '#5E5C58');
    content = content.replace(/#8A8A8A/gi, '#5E5C58');

    // Dark overlays -> Light overlays
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.3\)/g, 'rgba(140, 75, 64, 0.05)');
    content = content.replace(/rgba\(0,0,0,0\.3\)/g, 'rgba(140, 75, 64, 0.05)');

    fs.writeFileSync(fullPath, content);
    console.log('Updated:', filePaths);
});
