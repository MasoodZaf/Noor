#!/usr/bin/env bash
# Static a11y audit — run from `mobile/` directory.
# Counts touchables vs labels per file and flags any gaps.
# Exits 1 if any file has labels < touchables (regression).

set -e
cd "$(dirname "$0")/.."

echo "=== Falah static a11y audit ==="
echo

total_touch=0
total_label=0
total_gap=0
fail_files=()

for f in $(grep -rln "TouchableOpacity\|Pressable" app components 2>/dev/null | grep -v node_modules); do
    touchables=$(grep -cE '^\s*<(TouchableOpacity|Pressable)\b' "$f" || echo 0)
    labels=$(grep -cE 'accessibilityLabel' "$f" || echo 0)
    gap=$((touchables - labels))
    total_touch=$((total_touch + touchables))
    total_label=$((total_label + labels))

    if [ $gap -gt 0 ]; then
        fail_files+=("$f (touch=$touchables, label=$labels, gap=$gap)")
        total_gap=$((total_gap + gap))
    fi
done

echo "Total touchables: $total_touch"
echo "Total labels:     $total_label"
echo

# Switch / radio / tab state coverage
for role in switch radio tab; do
    matches=$(grep -rEn "accessibilityRole=\"$role\"" app components 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    states=$(grep -rB0 -A4 "accessibilityRole=\"$role\"" app components 2>/dev/null | grep -v node_modules | grep -cE 'accessibilityState=\{\{ (selected|checked)' || echo 0)
    echo "Role=$role: $matches / state coverage: $states"
done
echo

# Empty labels
empty=$(grep -rEcn 'accessibilityLabel=("\s*"|"")' app components 2>/dev/null | grep -v node_modules | grep -v ':0$' | wc -l | tr -d ' ')
echo "Empty/whitespace labels: $empty"

# Suspiciously short
short=$(grep -rEn 'accessibilityLabel="[^"]{0,2}"' app components 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
echo "Labels under 3 chars: $short"

# Hit-slop coverage
hits=$(grep -rEn 'hitSlop' app components 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
echo "hitSlop occurrences: $hits"
echo

if [ ${#fail_files[@]} -gt 0 ]; then
    echo "❌ FAIL — $total_gap touchables missing labels:"
    for f in "${fail_files[@]}"; do
        echo "   $f"
    done
    exit 1
fi

if [ "$empty" -gt 0 ] || [ "$short" -gt 0 ]; then
    echo "❌ FAIL — $empty empty + $short short labels"
    exit 1
fi

echo "✓ PASS — every touchable has a label"
