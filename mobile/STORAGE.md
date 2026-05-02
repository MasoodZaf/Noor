# Falah — Data Storage Model

**TL;DR** — Falah uses **device-scoped local storage**. No registration is
required to use the app. Every preference, bookmark, and progress entry is
written to AsyncStorage (or SQLite for bulk content) on the device. Optional
Supabase sign-in is wired up for the *future* cross-device sync feature; it
does not currently sync user data — only authenticates the session.

> **One-line consequence:** Uninstalling the app erases all preferences and
> bookmarks unless the user has iCloud Backup (iOS) or Auto-Backup (Android)
> enabled. There is currently no cross-device sync.

---

## 1. Storage layers

| Layer | Library | Purpose | Survives… |
|---|---|---|---|
| **AsyncStorage** | `@react-native-async-storage/async-storage` | All user state — preferences, bookmarks, progress, caches | App relaunch, OS reboot, app update. **Wiped on uninstall.** |
| **SQLite (read-only)** | `expo-sqlite` | Bundled content — Quran ayahs, Hadith, Duas, Qaida lessons, surah metadata | Same as the app binary itself |
| **SQLite (read-write)** | `expo-sqlite` | A handful of progress tables (`qaida_progress`) keyed on the local user ID | Same as AsyncStorage above |
| **Supabase Auth** *(optional)* | `@supabase/supabase-js` | Email/password login for an account that will *eventually* enable sync | Cleared on sign-out |

Network reachability and ISO country code (used for prayer method auto-pick)
are derived at runtime — never persisted.

---

## 2. The anonymous local user ID

`utils/userId.ts` generates a stable identifier on first launch:

```ts
const newId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
await AsyncStorage.setItem('@noor_local_user_id', newId);
```

Format: `local_1735806000000_a7b3k1z`. Used as the foreign key for SQLite tables
(e.g. Qaida progress) so the same install always sees its own progress and
nothing else.

When a user signs in via Supabase, `session.user.id` becomes available. Code
should pick the user ID with this precedence:

```ts
const uid = session?.user?.id ?? await getLocalUserId();
```

This pattern is already followed in `(tabs)/qaida.tsx`.

---

## 3. AsyncStorage key registry

Every persisted key in the app. Names with a `@noor/` prefix are recent;
unprefixed keys (`@prayer_settings`, `@dua_bookmarks`, `@hifz_entries`) are
older and **must not be renamed** because existing user data on devices
already uses them.

| Key | Type | Owner | Purpose |
|---|---|---|---|
| `@noor_local_user_id` | string | `utils/userId.ts` | Anonymous user ID (see §2) |
| `@prayer_settings` | `{ method: number, school: number }` | Home + Profile | Calculation method ID + Madhab. `method = -1` means Auto |
| `@noor/notif_prefs` | `Record<prayerId, boolean>` | Home | Per-prayer Adhan notification toggles |
| `@hifz_entries` | `HifzEntry[]` | Hifz tracker | SM-2 spaced-repetition state for tracked surahs |
| `@dua_bookmarks` | `string[]` (dua IDs) | Duas detail screen | Bookmarked duas |
| `@hadith_bookmarks` | `HadithItem[]` | Hadith detail screen | Bookmarked hadiths |
| `@noor/theme_mode` | `'auto'\|'warm'\|'forest'\|'midnight'` | ThemeContext | Theme |
| `@noor/theme_accent` | `'gold'\|'forest'\|'clay'\|'sky'` | ThemeContext | Accent palette |
| `@noor/arabic_scale` | `string` (`"1.0"`–`"1.6"`) | ThemeContext | Arabic font size multiplier |
| `@noor/language` | `Language` | LanguageContext | App language (6 supported) |
| `@noor/reciter` | string (reciter id) | ReciterContext | Selected Quran reciter |
| `@noor/offline_mode` | `'true'\|'false'` | NetworkModeContext | Force-offline toggle |
| `@noor/qibla_cache` | `{ bearing, lat, lng, ts }` | Qibla screen | Cached Qibla bearing |
| `@noor/ramadan_notif` | `'true'\|'false'` | Ramadan tracker | Ramadan reminder toggle |
| `@prayer_{date}_{lat}_{lng}_m{method}_s{school}` | timings JSON | Home | Daily prayer-time cache (per-day, per-location, per-method) |
| `@noor/daily_ayah_{date}` | `{ surah, ayah, monthName }` | Home | Cached daily ayah ref |
| `@noor/hijri_{year}_{month}` | calendar JSON | Calendar | Cached Hijri calendar month |

**Centralised constants** are in `utils/apis.ts` under `STORAGE_KEYS`. New
keys should be added there rather than hard-coded in screens.

---

## 4. SQLite tables

The bundled `noor_v20.db` is copied to `${documentDirectory}SQLite/noor_v20.db`
on first launch (see `context/DatabaseContext.tsx`). Schema highlights:

**Read-only content tables** (shipped with the binary):
- `surahs` — 114 surah metadata rows
- `ayahs` — full Quran with translations in 6 languages (`text_english`,
  `text_urdu`, `text_ind`, `text_fra`, `text_ben`, `text_tur`)
- `hadith` — primary collections; FTS5 index for search
- `duas` + `dua_categories`
- `qaida_lessons` + `qaida_content`

**Read-write user tables**:
- `qaida_progress` — keyed on the local/Supabase user ID

If you ship a new content version, bump the `dbVersion` constant in
`DatabaseContext.tsx` (currently `v20`). The new file gets copied next launch;
the old one is left in place but unused.

---

## 5. Cloud sync (planned, not active)

The pieces are wired:
- `utils/supabase.ts` configures the client with AsyncStorage as the auth
  store, autoRefreshToken, and persistSession.
- `(tabs)/profile.tsx` has working Sign In / Sign Up forms.
- `DatabaseContext` exposes a `syncData()` function (currently a 2-second
  stub).

**What's missing:** the actual sync implementation — mirroring AsyncStorage
keys (and `qaida_progress`) to Supabase tables keyed on `session.user.id`.
When implemented, the user-facing copy in the Profile "Backup status" card
will switch from "On this device" to "Synced as <email>".

A reasonable plan when you're ready: a `useCloudSync()` hook that registers
listeners on the bookmark / hifz / settings AsyncStorage keys, debounces
writes by 1-2s, and pushes to Supabase. Estimated effort: ~half a day.

---

## 6. Backup behaviour at the OS level

| Platform | Default | What's preserved |
|---|---|---|
| **iOS** | iCloud Backup is on for most users | AsyncStorage + the SQLite document file get backed up automatically. New device → restore from iCloud → preferences come along. |
| **Android** | Auto-Backup runs nightly when on Wi-Fi + idle (eligible apps) | Same scope, but the app must declare `android:allowBackup="true"` (Expo's default is true). |
| **Either** | If user disables backup or migrates without restore | Everything is lost — fresh install behaviour. |

Tester confusion is most likely here: people who sideload via TestFlight or
APK install often don't have backup configured, so they assume the data is
gone "forever". The Backup Status card on Profile (added in this batch)
makes that expectation explicit.

---

## 7. GDPR / privacy posture

- No PII is collected unless the user signs in (only then do we have an email).
- Location is requested for prayer times + Qibla, used in-memory + cached
  locally; never sent to any server.
- The Privacy Policy menu item in Profile points to `falah.app/privacy`
  (with a text fallback) — keep that policy in sync with this document.

---

## 8. When you're about to ship a change

- **Renaming a key?** Add a one-time migration in the Context that owns it
  (read old key → write new key → delete old). See the `LanguageContext`
  if a precedent is needed.
- **Adding a new key?** Register it in `utils/apis.ts:STORAGE_KEYS` first.
- **Storing structured data?** `JSON.stringify` on write, `JSON.parse` in a
  try/catch on read with a sane default — the existing screens follow this
  pattern.
- **Don't store secrets in AsyncStorage** — it's plaintext on disk. Use
  `expo-secure-store` if you ever need to.
