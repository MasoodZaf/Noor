# NOOR APP — QA/QC FIX TRACKER

## Status Legend
- ⬜ TODO
- 🔄 IN PROGRESS
- ✅ DONE
- ⏭️ SKIPPED (not applicable / already fixed)

---

## BATCH 1 (Original 30 Issues) — ALL RESOLVED ✅

---

## BATCH 2 (New Audit — 21 Issues)

### CRITICAL / HIGH

- [ ] #B1 ⬜ `components/MiniAudioPlayer.tsx` — Completely unthemed (hardcoded dark colors everywhere)
- [ ] #B2 ⬜ `app/zakat.tsx` — Hardcoded green/yellow state colors; negative input accepted
- [ ] #B3 ⬜ `app/tasbih.tsx` — Hardcoded teal (#4AADA0); animations not stopped on unmount
- [ ] #B4 ⬜ `app/salah.tsx` — Hardcoded purple (#7B4FA6) throughout
- [ ] #B5 ⬜ `app/search.tsx` — SQL injection via API data in `refs` string (unsanitized VALUES clause)
- [ ] #B6 ⬜ `app/search.tsx` — No user-facing error state when both API + offline search fail
- [ ] #B7 ⬜ `app/(tabs)/hadith/[id].tsx` — Language switch failure no user feedback
- [ ] #B8 ⬜ `app/(tabs)/quran/juz/[id].tsx` — Double fallback silent catch leaves ayahs stale
- [ ] #B9 ⬜ `app/duas/[id].tsx` — DB error treated as "not found" (conflation)

### MEDIUM

- [ ] #B10 ⬜ `app/salah.tsx` — `idx` in useEffect deps restarts interval on manual navigation
- [x] #B11 ✅ `app/(tabs)/quran/juz/[id].tsx` — QURAN_ACCENT removed; ayah markers now use `theme.gold` inline

### LOW

- [x] #B12 ✅ `app/search.tsx` — Non-fiqh badge: `#3b82f6` → `theme.accent`; bg `rgba(59,130,246,0.1)` → `theme.accentLight`
- [x] #B13 ✅ `app/duas/[id].tsx` — Expanded gradient: `rgba(201,168,76,0.08)` → `theme.gold+'14'`; `rgba(31,78,61,0.08)` → `theme.accent+'14'`
- [x] #B14 ✅ `app/zakat.tsx` — Progress bar fill uses `theme.gold`

---

## NEXT TO FIX: #B1

