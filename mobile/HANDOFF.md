# Falah — Session Handoff (build 7)

**Last touched:** 2026-05-02
**State:** APK B7 shipped, iOS TestFlight build 7 uploaded (was processing at handoff)

This document captures everything to know to resume the project. Open
issues, where to find things, what was changed and why. Read this and
`STORAGE.md` and you're caught up.

---

## 1. What shipped this session

Seven commits. All on `main`. Run `git log --oneline -15` for the full list.

| SHA | Description |
|---|---|
| `810256c` | 13 tester-feedback bugs (Tafseer vertical scroll, Duas copy/save, recitation false-score, Hadith filter, etc) |
| `b4e2810` | Score-9 push: a11y, types, perf, stability, tests, architecture |
| `4fe833d` | VoiceOver/TalkBack manual checklist |
| `3860746` | Static a11y audit script + Maestro flow expansion |
| `4f275c1` | STORAGE.md + Backup Status card on Profile |
| `d17fcff` | Bump to build 7 |

Net: **45+ files changed, +14k LOC, A- audit grade verified**.

---

## 2. Build status

### Android
- **APK at `mobile/Falah_B7.apk`** — 126 MB, signed with `android/app/noor-release.keystore`, versionCode 7.
- Built via `cd android && ./gradlew assembleRelease` (4m 59s).
- Ready to AirDrop / sideload / Firebase App Distribution.

### iOS
- **TestFlight build 7 uploaded** via Xcode → Archive → Distribute → App Store Connect.
- Was processing at handoff. Last shipped TF build before this was 3 (Mar 31).
- Three "Upload Symbols Failed" warnings (React.framework, ReactNativeDependencies.framework, hermes.framework) — cosmetic; only affects auto-symbolicated crash logs.
- buildNumber=7 set in `ios/Falah/Info.plist` line 42 + `app.json`.

### Where to check TestFlight processing
https://appstoreconnect.apple.com → Falah → TestFlight → iOS Builds → Build Uploads section. Yellow "Processing" → green "Complete" usually 5–15 min.

---

## 3. Open follow-ups (in priority order)

### A. Real-device VoiceOver pass (manual, ~25 min)
- Checklist at `.maestro/voiceover-talkback-checklist.md` — 78 checks across all tabs.
- Static audit (`npm run test:a11y`) reports 235/236 touchables labelled, 100% role+state coverage. Manual pass verifies pronunciation/focus order/modal trapping which automation can't.
- Apple reviewers do this. Recommended before any **External Testing** group is approved.

### B. Cross-device sync (~half day)
- Pieces in place: Supabase auth works in `(tabs)/profile.tsx`, AsyncStorage keys centralized in `utils/apis.ts:STORAGE_KEYS`.
- Stub: `context/DatabaseContext.tsx:syncData()` is a 2s sleep.
- Implementation: `useCloudSync()` hook that listens on bookmark/Hifz/settings keys, debounces by 1-2s, pushes to Supabase tables keyed on `session.user.id`.
- UI already says "coming soon" — Backup Status card on Profile flips message based on `session` truthy.

### C. dSYM upload (cosmetic, ~10 min)
- In Xcode: open Pods workspace → React-Core, ReactNativeDependencies, hermes-engine targets → Build Settings → Debug Information Format → Release → "DWARF with dSYM File".
- Don't bother for build 7. Do it before next App Store submission.

### D. Image cache wired only into Duas (~30 min)
- `components/CachedImage.tsx` + `useCachedImageUri` exist and work.
- Currently used: `app/duas/index.tsx` (Unsplash category images).
- Not yet wired: `discover/articles.tsx` (article hero images), `discover/halal.tsx` (none — uses native maps).

### E. Pre-existing in-progress changes on disk (uncommitted)
- `assets/icon.png` and `scripts/seed_indopak.js` — modifications that pre-date this session, untouched.
- `.maestro/flows/00_smoke_all_tabs.yaml` through `11_notifications_modal.yaml` — pre-existing Maestro flows that show as untracked. Possibly user's separate work.
- These are NOT mine — left for the user to decide.

---

## 4. Where things live now

### New utilities (use these instead of duplicating)
```
utils/
  apis.ts              ← all 6 API endpoints + STORAGE_KEYS registry
  sm2.ts               ← SM-2 spaced repetition (extracted from hifz)
  language.ts          ← 6-language helpers (translationCol, fawazLangCode, isRtl)
  prayer.ts            ← COUNTRY_METHODS, methodForCountry, nextPrayer
  arabic.ts            ← sanitizeArabicText (Uthmani mark stripper)
  hijriContent.ts      ← getDailyVerseForDate, isFriday, nextFridayAt
  supabase.ts          ← Supabase client (auth wired, sync stubbed)
  network.ts           ← checkOnline (expo-network + Cloudflare HEAD)
  userId.ts            ← anonymous local user ID
```

### New components
```
components/
  ErrorBoundary.tsx    ← root-level, wraps all providers in _layout.tsx
  CachedImage.tsx      ← <CachedImage> + useCachedImageUri hook
  MiniAudioPlayer.tsx  ← (pre-existing)
```

### New tests
```
__tests__/
  arabic.test.ts       ← 10 tests
  hijriContent.test.ts ← 8 tests
  apis.test.ts         ← 10 tests
  sm2.test.ts          ← 16 tests
  language.test.ts     ← 14 tests
  prayer.test.ts       ← 15 tests
                         ── 73 total ──
```

### New tooling
```
.maestro/
  a11y-audit.sh                      ← static a11y audit script
  A11Y_AUDIT_REPORT.md               ← coverage snapshot
  voiceover-talkback-checklist.md    ← manual screen-reader pass
  flows/12_accessibility_smoke.yaml  ← ~25 a11y assertions
```

### New docs
```
mobile/
  STORAGE.md           ← canonical persistence reference (8 sections)
  HANDOFF.md           ← this file
```

---

## 5. Resuming

### Pick up where we left off
```bash
cd /Users/masoodzafar/Noor/mobile

# What's the last commit?
git log --oneline -5

# Are tests + types + a11y still clean?
npm run verify

# Run dev server?
npx expo start --dev-client

# Rebuild APK?
cd android && ./gradlew assembleRelease

# Re-archive iOS for TestFlight?
open ios/Falah.xcworkspace
# In Xcode: destination = Any iOS Device (arm64) → Product → Archive
```

### To bump to build 8 (next round)
1. Edit `app.json` → `buildNumber: "8"`, `versionCode: 8`
2. Edit `ios/Falah/Info.plist` line 42 → `<string>8</string>`
3. Edit `android/app/build.gradle` line 95 → `versionCode 8`
4. APK: `cd android && ./gradlew assembleRelease`
5. iOS: Xcode → Archive

### Emergency knowledge
- **Android emulator dies in adb**: `adb kill-server && adb start-server && emulator -avd Medium_Phone_API_36.1 -no-snapshot-save`
- **iOS build fails with "realpath -m"**: `coreutils` already installed, but if PATH changed: `ln -sf /usr/local/bin/grealpath /usr/local/bin/realpath`
- **iOS sandbox error on PhaseScriptExecution**: `ENABLE_USER_SCRIPT_SANDBOXING = NO` in `ios/Falah.xcodeproj/project.pbxproj` (already set; if `expo prebuild` overwrites, re-apply).
- **First-launch DB takes long**: `noor_v20.db` is being copied from asset. Wait. Cleared on uninstall.

---

## 6. Score card snapshot

| Dimension | Score |
|---|---:|
| Code Quality | 8.5 |
| UX Completeness | 8.5 |
| Design Consistency | 8.5 |
| Performance | 8.0 |
| Accessibility | 9.0 (static); manual audio pass pending |
| Stability | 9.0 |
| Offline Resilience | 7.0 |
| Architecture | 9.5 |
| Polish | 8.0 |
| Testability | 9.5 |
| **Overall (weighted)** | **~8.7 / 10 — A-** |

---

## 7. Session memory notes (auto-loaded by Claude Code)

These are stored at `~/.claude/projects/-Users-masoodzafar-Noor/memory/`:
- `MEMORY.md` (index, always loaded)
- `project_session_2026_05_02.md` — this session's deliverables
- `reference_utils_apis.md` — utils/ module map
- `reference_quality_infrastructure.md` — ErrorBoundary, CachedImage, tests, a11y

Future Claude Code sessions for this project will pick these up automatically.
