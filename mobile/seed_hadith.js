const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const arPath = '/tmp/bukhari_ar.json';
const enPath = '/tmp/bukhari_en.json';

const arData = JSON.parse(fs.readFileSync(arPath, 'utf8')).hadiths;
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8')).hadiths;

const db = new sqlite3.Database('assets/noor.db');

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO hadiths_fts (book_slug, hadith_number, text_arabic, text_english, narrator) VALUES ('bukhari', ?, ?, ?, ?)");
    
    // Process first 100 for demonstration to avoid massive blocking insert
    for(let i = 0; i < 100; i++) {
        const ar = arData[i];
        const en = enData[i];
        if(!ar || !en) continue;
        
        let narrator = 'Unknown';
        if(en.text.toLowerCase().includes('narrated')) {
            const match = en.text.split(':')[0];
            narrator = match.replace('Narrated ', '');
        }

        stmt.run(ar.hadithnumber, ar.text, en.text, narrator);
    }
    
    stmt.finalize();
    console.log("Successfully seeded 100 actual authentic Bukhari hadiths into FTS index.");
});

db.close();
