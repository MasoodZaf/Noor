
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const db = new sqlite3.Database('assets/noor.db');

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    console.log("Fetching Indo Pak text...");
    try {
        const p = await fetchJson('https://api.alquran.cloud/v1/quran/quran-indopak');
        if (!p || !p.data) throw new Error("Invalid API response");

        console.log("Adding column...");
        db.serialize(() => {
            db.run(`ALTER TABLE ayahs ADD COLUMN text_arabic_indopak TEXT;`, (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    console.log("Column existing or error:", err.message);
                }
            });

            console.log("Updating ayahs...");
            db.run("BEGIN TRANSACTION;");
            const stmt = db.prepare("UPDATE ayahs SET text_arabic_indopak = ? WHERE surah_number = ? AND ayah_number = ?");

            for (const surah of p.data.surahs) {
                for (const ayah of surah.ayahs) {
                    stmt.run(ayah.text, surah.number, ayah.numberInSurah);
                }
            }
            stmt.finalize();
            db.run("COMMIT;", () => {
                console.log("Finished adding text_arabic_indopak!");
                db.close();
            });
        });
    } catch (e) {
        console.error(e);
    }
}

run();
