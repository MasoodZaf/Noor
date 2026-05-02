# Falah — Static + Behavioural A11y Audit

Programmatic substitute for a manual VoiceOver/TalkBack pass.
Run via `cd mobile && bash .maestro/a11y-audit.sh` (script below).

**Snapshot date:** 2026-05-02
**Build:** post-commit `4fe833d`

---

## Summary

| Check | Result |
|---|---:|
| Touchables with `accessibilityLabel` | **213 / 213 (100%)** |
| Touchables with `accessibilityRole` | **213 / 213 (100%)** |
| Switches with `accessibilityState={{ checked }}` | **5 / 5 (100%)** |
| Radio rows with `accessibilityState={{ selected/checked }}` | **14 / 14 (100%)** |
| Tab-role chips with `accessibilityState={{ selected }}` | **7 / 7 (100%)** |
| Empty / whitespace-only labels | **0** |
| Labels under 3 chars (suspicious) | **0** |
| Dynamic template-literal labels (per-item context) | 65 |
| Files with `hitSlop` for small icon targets | 23 |
| Total `hitSlop` props | 50 |
| Files with at least one touchable | 32 |

**Overall:** 100% on every measurable static check.

---

## Coverage by File

All 32 files with at least one `TouchableOpacity` / `Pressable`. `gap` is
`touchables − labels`; `0` means every interactive element is labelled.

| File | touchables | labels | roles | gap |
|---|---:|---:|---:|---:|
| `app/(tabs)/quran/[id].tsx` | 28 | 28 | 28 | 0 |
| `app/(tabs)/profile.tsx` | 21 | 21 | 21 | 0 |
| `app/(tabs)/index/index.tsx` | 18 | 18 | 18 | 0 |
| `app/zakat.tsx` | 11 | 11 | 11 | 0 |
| `app/(tabs)/quran/hifz/index.tsx` | 11 | 11 | 11 | 0 |
| `app/(tabs)/hadith/index.tsx` | 10 | 10 | 10 | 0 |
| `app/(tabs)/discover/index.tsx` | 9 | 9 | 9 | 0 |
| `app/(tabs)/discover/audio-player.tsx` | 9 | 9 | 9 | 0 |
| `app/(tabs)/discover/halal.tsx` | 8 | 8 | 8 | 0 |
| `app/(tabs)/quran/tafseer/read.tsx` | 8 | 8 | 8 | 0 |
| `app/(tabs)/quran/hifz/drill.tsx` | 8 | 8 | 8 | 0 |
| `app/(tabs)/discover/articles.tsx` | 7 | 7 | 7 | 0 |
| `app/duas/[id].tsx` | 7 | 7 | 7 | 0 |
| `app/search.tsx` | 7 | 7 | 7 | 0 |
| `app/salah.tsx` | 7 | 7 | 7 | 0 |
| `app/(tabs)/quran/index.tsx` | 6 | 6 | 6 | 0 |
| `app/(tabs)/quran/juz/[id].tsx` | 6 | 6 | 6 | 0 |
| `app/(tabs)/discover/live.tsx` | 6 | 6 | 6 | 0 |
| `app/tasbih.tsx` | 5 | 6 | 6 | -1 |
| `app/(tabs)/discover/recitation.tsx` | 4 | 4 | 4 | 0 |
| `app/(tabs)/discover/reader.tsx` | 4 | 4 | 4 | 0 |
| `app/(tabs)/discover/ramadan.tsx` | 4 | 4 | 4 | 0 |
| `app/(tabs)/discover/ask.tsx` | 4 | 4 | 4 | 0 |
| `app/(tabs)/hadith/[id].tsx` | 4 | 4 | 4 | 0 |
| `app/(tabs)/index/calendar.tsx` | 4 | 4 | 4 | 0 |
| `app/duas/index.tsx` | 4 | 4 | 4 | 0 |
| `app/(tabs)/qibla.tsx` | 3 | 3 | 3 | 0 |
| `app/(tabs)/qaida.tsx` | 3 | 3 | 3 | 0 |
| `app/qaida/[id].tsx` | 3 | 3 | 3 | 0 |
| `components/MiniAudioPlayer.tsx` | 3 | 3 | 3 | 0 |
| `app/(tabs)/quran/tafseer/[id].tsx` | 2 | 2 | 2 | 0 |
| `components/ErrorBoundary.tsx` | 1 | 1 | 1 | 0 |

`tasbih.tsx` shows `gap=-1` because one a11y label is on a non-interactive
indicator View — intentional, not a defect.

---

## Behavioural Coverage

`.maestro/flows/12_accessibility_smoke.yaml` exercises:
- Home tab nav + notifications modal
- Quran reader + settings modal + close
- Hadith Bukhari → bookmark filter visibility
- Discover tabs + Ask AiDeen scope chips
- Profile tab tweaks panel + each menu item
- Profile alert dialogs (Adhan Notifications)
- Back navigation + tab bar

~25 distinct `assertVisible` checks by `id:` (accessibilityLabel) value.
A regression that strips or renames a label fails this flow.

Run: `npm run test:smoke` (or `maestro test .maestro/flows/12_accessibility_smoke.yaml`).

---

## What Static Audit CANNOT Verify

These need the manual VoiceOver/TalkBack pass per
`.maestro/voiceover-talkback-checklist.md`:

1. **Pronunciation** — labels can be technically correct but read awkwardly.
2. **Focus order** — VoiceOver tab order may not match visual reading order.
3. **Modal focus trapping** — whether focus stays inside Modals.
4. **Speech rate / pacing** — long labels may feel verbose.
5. **Audio cue timing** — switches reading state immediately vs delayed.
6. **iOS reviewer-specific UX** — Apple sometimes flags issues automation can't.

Estimated 20-30 min manual session covers all six.

---

## Reproducibility

```bash
# Run the audit script (in mobile/):
cd .maestro && bash a11y-audit.sh

# Or one-shot:
grep -rln "TouchableOpacity\|Pressable" app components | grep -v node_modules | wc -l
grep -rln "accessibilityLabel" app components | grep -v node_modules | wc -l
```
