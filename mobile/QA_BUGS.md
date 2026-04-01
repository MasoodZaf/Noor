# Falah App — QA Bug Tracker

> Source: Tester feedback (Umer Jalil, Ahsan Jalil) — reviewed 2026-04-01
> Engineer: Masood Zafar

---

## Legend
| Status | Meaning |
|--------|---------|
| ✅ Fixed | Code change applied in this session |
| 🔍 Needs Device | Cannot confirm from code alone — requires device testing |
| 📋 Backlog | Confirmed bug, fix deferred |
| 💡 Suggestion | UX improvement, not a bug |

---

## Issues

### 1. Surah Fatihah — Missing / Incomplete Verses
**Reporter:** Umer Jalil, Ahsan Jalil
**Status:** 🔍 Needs Device
**File:** `app/(tabs)/quran/[id].tsx:995`, `app/(tabs)/quran/juz/[id].tsx`
**Finding:** The Quran reader correctly sets `bismillah_pre = false` for Surah 1 (bismillah IS ayah 1). API returns all 7 verses. The display issue is likely in the **Juz reader** which needs a separate audit. Tafseer shows correctly because it fetches per-ayah independently.
**Action:** Audit `juz/[id].tsx` for verse rendering logic — compare with `[id].tsx`.

---

### 2. Qibla Finder — Incorrect Direction ("Totally Opposite")
**Reporter:** Ahsan Jalil
**Status:** 🔍 Needs Device
**File:** `app/(tabs)/qibla.tsx:237`
**Finding:** Formula `needleRotation = qiblaDirection - heading` is mathematically correct. The "totally opposite" report may be Android-specific: on Android, `trueHeading` requires a GPS fix; the fallback `magHeading` can be off without declination correction. The smoothing ALPHA (0.18 on Android) is also lower, which may cause lag.
**Action:** Test on an Android device without active GPS lock. If confirmed, add magnetic declination correction for Android.

---

### 3. Upcoming Prayer Colours — Contrast Issue in Warm Theme
**Reporter:** Ahsan Jalil
**Status:** 🔍 Needs Device
**File:** `context/ThemeContext.tsx` — `WARM_PARCHMENT`
**Finding:** `textTertiary: '#9A9287'` on `bg: '#FDF8EF'` is approximately 3.1:1 contrast ratio — below WCAG AA (4.5:1). Inactive/upcoming prayer labels likely use this colour.
**Action:** Raise `textTertiary` to a darker value in WARM_PARCHMENT (e.g. `#7A7268`) to meet WCAG AA.

---

### 4. Midnight Theme — Contrast Issues
**Reporter:** Ahsan Jalil
**Status:** 🔍 Needs Device
**File:** `context/ThemeContext.tsx` — `MIDNIGHT_BLUE`
**Finding:** `textTertiary: '#4E5670'` on `bg: '#0C0F18'` is very low contrast (~2.3:1). Tester suggests keeping fewer themes; at minimum fix contrast values.
**Action:** Audit all text colour uses for Midnight theme. Consider consolidating to 3 themes (auto/warm/dark).

---

### 5. "Mecca" vs "Makkah"
**Reporter:** Ahsan Jalil
**Status:** 📋 Backlog
**File:** `app/(tabs)/quran/[id].tsx:462,977`
**Finding:** The Quran reader badge shows "Meccan" / "Medinan" (scholarly terms derived from the API value `'makkah'`). The word "Mecca" is never shown — it's always "Meccan". Tester may be referring to these badges.
**Action:** Rename badges from "Meccan/Medinan" → "Makki/Madani" which is the conventional Islamic terminology.

---

### 6. About Falah — Old Developer Details
**Reporter:** Ahsan Jalil
**Status:** 💡 Suggestion (deferred)
**File:** `app/(tabs)/profile.tsx:279, 407`
**Finding:** Alert shows `"By MZ and MBZ"` — raw developer initials. Both authenticated and unauthenticated views have this text.
**Decision:** Keep "By MZ and MBZ" for now. Revisit styling (small/muted font) when a proper About screen is built.

---

### 7. Language Selector — Should Be a Dropdown
**Reporter:** Ahsan Jalil
**Status:** ✅ Fixed
**File:** `app/(tabs)/profile.tsx:30-34, 195-211`
**Finding:** Language selection was a single tap-to-cycle button cycling through 6 languages with no visibility of options.
**Fix Applied:** Converted to a Modal dropdown showing all 6 languages as selectable list items with checkmark on active one.

---

### 8. Active Recitation — Sits Above Navigation Bar
**Reporter:** Ahsan Jalil
**Status:** ✅ Fixed
**File:** `components/MiniAudioPlayer.tsx:53`
**Finding:** MiniAudioPlayer used `position: 'absolute', bottom: 0` with no tab bar offset — overlaying the navigation bar completely. No way to tap back to the surah.
**Fix Applied:** Added tab bar height offset (`Platform.OS === 'ios' ? 88 : 64` + `insets.bottom`) so player sits above the navigation bar. Added tap-on-track-info to navigate back to the surah.

---

### 9. Halal Places Map — Shows Blocked Despite Permission
**Reporter:** Ahsan Jalil
**Status:** 🔍 Needs Device
**File:** `app/(tabs)/discover/halal.tsx`
**Finding:** Android WebView (Leaflet) receives location via `onMessage` from RN. If the WebView loads before `location` state is set (race condition), it may display a "blocked" state.
**Action:** Test on Android. Ensure location is populated before WebView injections run.

---

### 10. Tagging / Copy / Share in Duas, Hadith — Non-functional
**Reporter:** Ahsan Jalil
**Status:** 💡 Suggestion
**Finding:** Tester questions whether tagging/copy functions are needed. Share buttons appear non-functional.
**Action:** Audit `app/duas/` and `app/(tabs)/hadith/[id].tsx` for copy/share/tag buttons. Remove non-functional ones or wire to `Share.share()`. Decision: remove tag feature, keep copy + share.

---

### 11. Duas — Missing Sticky Category Headers
**Reporter:** Ahsan Jalil
**Status:** 📋 Backlog
**File:** `app/duas/index.tsx`
**Finding:** Duas list uses ScrollView with tile grid — no sticky section headers. User loses context when scrolling.
**Action:** Convert to `SectionList` with sticky headers above each category group.

---

### 12. Duas — Icons Above Category Titles
**Reporter:** Ahsan Jalil
**Status:** 💡 Suggestion
**Finding:** Category tiles have an icon box + image card layout. Tester finds icons above titles unnecessary.
**Action:** Remove icon boxes from category tiles, keep image background + title only for a cleaner card.

---

### 13. Tasbih — Edit Icon Has No Function
**Reporter:** Ahsan Jalil
**Status:** ✅ Fixed
**File:** `app/tasbih.tsx:239`
**Finding:** `<Feather name="edit-2">` rendered next to "Round N" label with no `onPress` — purely decorative, confusing to users.
**Fix Applied:** Removed the orphaned edit icon.

---

### 14. Tasbih — "Custom" Preset Not Actually Customizable
**Reporter:** Ahsan Jalil
**Status:** ✅ Fixed
**File:** `app/tasbih.tsx:21`
**Finding:** PRESETS included `{ id: 'custom', label: 'Custom', target: 100 }` — hardcoded target and dhikr text. No UI to modify. Misleading label.
**Fix Applied:** Replaced "Custom" with a proper 4th preset: "Astaghfirullah" (target: 100) — same dhikr, honest label.

---

### 15. Prayer Times Method Selector — Should Live in Settings
**Reporter:** Ahsan Jalil
**Status:** 📋 Backlog
**File:** `app/(tabs)/index/index.tsx:292`, `app/(tabs)/profile.tsx:391`
**Finding:** The prayer method selector (CALC_METHODS modal) lives on the Home screen header. Settings/Profile already has a stub "Calculation Method" menu item that does nothing.
**Action:** Move CALC_METHODS modal + `prayerSettings` AsyncStorage logic into `profile.tsx`. Wire up the stub. Remove from home screen header.

---

### 16. "Ramadan" Section — Should Show "Fasting" Outside Ramadan
**Reporter:** Ahsan Jalil
**Status:** ✅ Fixed
**File:** `app/(tabs)/discover/index.tsx:476`
**Finding:** Tile label hardcoded as `"Ramadan"` year-round.
**Fix Applied:** Added Hijri month detection via `moment-hijri`. Label shows `"Ramadan"` during Ramadan (iMonth === 8) and `"Fasting"` the rest of the year. Subtitle also updates accordingly.

---

### 17. Al Deen Results — Should Be Shareable
**Reporter:** Ahsan Jalil
**Status:** 💡 Suggestion
**File:** `app/(tabs)/discover/ask.tsx`
**Finding:** AI search results (Qurani.ai) have no share button. Users cannot share interesting Q&A results.
**Action:** Add `Share.share()` button to each result card in the Ask AiDeen screen.

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Fixed this session | 6 |
| 🔍 Needs device testing | 5 |
| 📋 Backlog (confirmed, deferred) | 3 |
| 💡 Suggestions | 3 |
| **Total** | **17** |
