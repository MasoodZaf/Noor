/**
 * seed_hadiths_full.js
 *
 * Seeds ALL 4 hadith collections (Bukhari, Muslim, Tirmidhi, Abu Dawud)
 * into the existing assets/noor.db, then rebuilds FTS5 for search.
 *
 * Run: node scripts/seed_hadiths_full.js
 */

const sqlite3 = require('sqlite3').verbose();
const https   = require('https');
const path    = require('path');

const DB_PATH = path.join(__dirname, '../assets/noor.db');
const FAWAZ   = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

const COLLECTIONS = [
    { slug: 'bukhari',  ara: 'ara-bukhari',  eng: 'eng-bukhari'  },
    { slug: 'muslim',   ara: 'ara-muslim',   eng: 'eng-muslim'   },
    { slug: 'tirmidhi', ara: 'ara-tirmidhi', eng: 'eng-tirmidhi' },
    { slug: 'abudawud', ara: 'ara-abudawud', eng: 'eng-abudawud' },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                res.resume();
                return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('📖  Opening database:', DB_PATH);
    const db = new sqlite3.Database(DB_PATH);

    const run  = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, err => err ? rej(err) : res()));
    const exec = (sql)              => new Promise((res, rej) => db.exec(sql, err => err ? rej(err) : res()));

    // ── 1. Schema ─────────────────────────────────────────────────────────────
    console.log('\n🔧  Rebuilding hadith schema…');
    await exec(`
        DROP TABLE IF EXISTS hadiths;
        DROP TABLE IF EXISTS hadiths_fts;
    `);

    await run(`
        CREATE TABLE hadiths (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_slug  TEXT    NOT NULL,
            hadith_number    INTEGER NOT NULL,
            book_number      INTEGER NOT NULL DEFAULT 0,
            arabic_text      TEXT    NOT NULL DEFAULT '',
            english_text     TEXT    NOT NULL DEFAULT '',
            narrator_chain   TEXT    NOT NULL DEFAULT '',
            grade            TEXT    NOT NULL DEFAULT ''
        )
    `);

    await run(`CREATE INDEX idx_hadiths_slug ON hadiths(collection_slug)`);
    await run(`CREATE INDEX idx_hadiths_slug_num ON hadiths(collection_slug, hadith_number)`);

    // ── 2. Fetch & insert each collection ─────────────────────────────────────
    for (const col of COLLECTIONS) {
        console.log(`\n⬇️   Fetching ${col.slug} (Arabic + English)…`);

        const [araData, engData] = await Promise.all([
            fetchJson(`${FAWAZ}/${col.ara}.min.json`),
            fetchJson(`${FAWAZ}/${col.eng}.min.json`),
        ]);

        const araHadiths = araData.hadiths ?? [];
        const engHadiths = engData.hadiths ?? [];

        // Build a map for fast lookup: hadithnumber → row
        const engMap = new Map();
        for (const h of engHadiths) engMap.set(h.hadithnumber, h);

        console.log(`   ${araHadiths.length} Arabic · ${engHadiths.length} English entries`);

        // Filter out hadiths where both Arabic and English are empty
        const valid = araHadiths.filter(h => {
            const eng = engMap.get(h.hadithnumber);
            return (h.text && h.text.trim()) || (eng?.text && eng.text.trim());
        });

        console.log(`   ${valid.length} hadiths have content — inserting…`);

        await run('BEGIN TRANSACTION');
        const stmt = db.prepare(
            `INSERT INTO hadiths
                 (collection_slug, hadith_number, book_number, arabic_text, english_text, grade)
             VALUES (?, ?, ?, ?, ?, ?)`
        );

        for (const ara of valid) {
            const eng      = engMap.get(ara.hadithnumber) ?? {};
            const grade    = eng.grades?.[0]?.grade ?? '';
            const bookNum  = ara.reference?.book ?? 0;

            await new Promise((res, rej) =>
                stmt.run(
                    col.slug,
                    ara.hadithnumber,
                    bookNum,
                    ara.text?.trim()  ?? '',
                    eng.text?.trim()  ?? '',
                    grade,
                    err => err ? rej(err) : res()
                )
            );
        }

        await new Promise((res, rej) => stmt.finalize(err => err ? rej(err) : res()));
        await run('COMMIT');
        console.log(`   ✅  ${col.slug} done`);
    }

    // ── 3. FTS5 virtual table for full-text search ────────────────────────────
    console.log('\n🔍  Rebuilding FTS5 search index…');
    await run(`
        CREATE VIRTUAL TABLE hadiths_fts USING fts5(
            collection_slug UNINDEXED,
            hadith_number   UNINDEXED,
            arabic_text     UNINDEXED,
            english_text,
            narrator_chain,
            content        = 'hadiths',
            content_rowid  = 'id',
            tokenize       = 'porter'
        )
    `);
    await run(`INSERT INTO hadiths_fts(hadiths_fts) VALUES ('rebuild')`);
    console.log('   ✅  FTS5 index built');

    // ── 4. Stats ──────────────────────────────────────────────────────────────
    const total = await new Promise(res => db.get('SELECT count(*) as c FROM hadiths', (_, r) => res(r.c)));
    console.log(`\n📊  Total hadiths in DB: ${total}`);

    for (const col of COLLECTIONS) {
        const n = await new Promise(res =>
            db.get('SELECT count(*) as c FROM hadiths WHERE collection_slug = ?', [col.slug], (_, r) => res(r.c))
        );
        console.log(`     ${col.slug.padEnd(10)} ${n}`);
    }

    // ── 5. Vacuum ─────────────────────────────────────────────────────────────
    console.log('\n🗜️   Vacuuming…');
    await run('VACUUM');

    db.close();
    console.log('\n🎉  Seed complete! Run seed again after schema changes, then bump DB version.');
}

main().catch(err => {
    console.error('\n❌  Seed failed:', err);
    process.exit(1);
});
