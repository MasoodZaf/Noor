# Falah App — Change Log

> Last 15 days of bug fixes and improvements
> Period: 2026-03-18 → 2026-04-01

---

## 2026-04-01 — Build 4  `e7ab0e7`

### Juz Reader — Full Rewrite

| # | Bug | Root Cause | Fix Applied |
|---|-----|-----------|-------------|
| 1 | Juz renders one ayah per page (horizontal swipe) | `FlatList` was `horizontal={true}` + `pagingEnabled={true}` | Replaced with vertical `FlatList` — matches Surah reader UX |
| 2 | All surah names showed as "Surah N" | Stale React state closure — `surahMap` state not yet updated when `merged` array was built | Fixed by using local `nameMap` variable directly instead of state |
| 3 | Verses silently truncated | API `per_page=300` — some juzs exceed this | Added paginated fetch loop until `total_count` is reached |
| 4 | Bismillah shown incorrectly for Surah 1 | Logic didn't account for Surah 1 (bismillah IS ayah 1, not a separate header) | Bismillah banner excluded for Surah 1 and Surah 9 |
| 5 | Translation text misaligned with Arabic | Index-based mapping between Fawaz CDN and Quran.com verse arrays could drift | Array-based fetch now stays strictly aligned with Quran.com verse order |
| 6 | Scroll conflict on Android | `ScrollView` nested inside `FlatList` — caused touch conflicts | Removed inner `ScrollView`, each ayah is a flat row |
| 7 | Urdu translation not rendering correctly | `NotoNastaliqUrdu_400Regular` font not loaded in Juz reader | Added Urdu font, proper RTL + writing direction applied |

**File changed:** `mobile/app/(tabs)/quran/juz/[id].tsx`

---

## 2026-04-01 — Build 3  `824f964`

### QA Session — Tester Feedback (Umer Jalil, Ahsan Jalil)

| # | Bug | Root Cause | Fix Applied |
|---|-----|-----------|-------------|
| 8 | Mini player overlaps navigation bar | `MiniAudioPlayer` used `position: absolute, bottom: 0` with no tab bar offset | Added platform tab bar height offset (`88/64 + insets.bottom`). Player now floats above nav bar |
| 9 | No way to navigate back to surah from mini player | Mini player had no press handler | Tapping track info area now navigates to the playing surah |
| 10 | Language selector required multiple taps to cycle through 6 languages | Implemented as a tap-to-cycle button with no visibility of options | Replaced with a Modal dropdown showing all 6 languages with active checkmark |
| 11 | "Custom" Tasbih preset was not customisable | PRESETS had a hardcoded `{ id: 'custom', target: 100 }` entry with no edit UI | Replaced with an honest preset: "Astaghfirullah" (same dhikr, correct label) |
| 12 | Edit icon in Tasbih header had no function | `<Feather name="edit-2">` rendered next to Round label with no `onPress` | Removed orphaned icon |
| 13 | Discover tile showed "Ramadan" year-round | Label hardcoded as `"Ramadan"` | Dynamic label using `moment-hijri` — shows "Ramadan" in Hijri month 9, "Fasting" otherwise |
| 14 | About Falah showed raw developer initials ("By MZ and MBZ") | Alert text not updated after internal testing phase | Cleaned up description text; initials kept as-is (intentional, decision deferred) |

**Files changed:**
- `mobile/components/MiniAudioPlayer.tsx`
- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/tasbih.tsx`
- `mobile/app/(tabs)/discover/index.tsx`

---

## 2026-03-31 — Build 3 (iOS TestFlight)  `17f536b`

### iOS App Store / TestFlight Preparation

| # | Item | Detail |
|---|------|--------|
| 15 | App Store rejection — missing privacy strings | `NSPhotoLibraryUsageDescription` was absent from `infoPlist` | Added all required privacy usage strings to `app.json` |
| 16 | New screens added | Search, Audio Player, Reader screens | Added `search.tsx`, `discover/audio-player.tsx`, `discover/reader.tsx` |
| 17 | ThemeContext & NetworkModeContext introduced | App-wide theme switching + offline mode toggle | Added `ThemeContext.tsx` and `NetworkModeContext.tsx` |
| 18 | Notification icon missing | Required for Android notification channel | Added `assets/notification-icon.png` |
| 19 | Mosque imagery for Home screen | Hero card background images | Added 5 mosque assets under `assets/mosques/` |
| 20 | `.gitignore` updated | `ios/`, `android/`, `*.apk`, `*.ipa` excluded | Prevents generated build artifacts from being committed |
| 21 | buildNumber bumped to 3 | Required for TestFlight to accept new build | Bumped `buildNumber` in `app.json` |

**Files changed:** 40+ files across all screens and assets

---

## Open Items (Not Yet Fixed)

| # | Issue | Status |
|---|-------|--------|
| A | Qibla shows incorrect direction on some Android devices | 🔍 Needs device testing |
| B | Warm theme — upcoming prayer labels have low contrast | 🔍 Needs device testing |
| C | Midnight theme — contrast issues in text tertiary | 🔍 Needs device testing |
| D | Halal map shows blocked despite location permission (Android) | 🔍 Needs device testing |
| E | Surah Fatihah verse count in Juz — verify after build 4 | 🔍 Confirm on device |
| F | Prayer method selector should move to Settings screen | 📋 Backlog |
| G | Duas missing sticky category headers | 📋 Backlog |
| H | "Meccan/Medinan" badges → "Makki/Madani" | 📋 Backlog |
| I | Al Deen results — add Share button | 💡 Suggestion |
| J | Duas — remove icons above category tiles | 💡 Suggestion |

---

## Build History

| Build | Date | Platform | Version | Notes |
|-------|------|----------|---------|-------|
| 4 | 2026-04-01 | Android APK | 1.0.0 (vc:4) | Juz reader rewrite |
| 3 | 2026-04-01 | Android APK | 1.0.0 (vc:3) | QA fixes batch |
| 3 | 2026-03-31 | iOS TestFlight | 1.0.0 (bn:3) | Privacy strings + new screens |
