#!/bin/sh
# Builds the CV in both languages into site/public/cv/. Runs as part of the site build, so a broken
# CV fails the build. Only the fonts in cv/fonts/ are used, so the result is the same on any machine.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
out="$root/site/public/cv"

if ! command -v typst >/dev/null 2>&1; then
  echo "cv/build.sh: typst not found. Install the version pinned in .github/actions/setup-typst." >&2
  exit 1
fi

mkdir -p "$out"
for lang in en de; do
  upper=$(printf '%s' "$lang" | tr '[:lower:]' '[:upper:]')
  typst compile "$root/cv/template.typ" "$out/Vedad_Dizdarevic_CV_$upper.pdf" \
    --root "$root/cv" \
    --font-path "$root/cv/fonts" \
    --ignore-system-fonts \
    --pdf-standard a-2a,ua-1 \
    --input "lang=$lang"
done
