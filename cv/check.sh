#!/bin/sh
# Checks the built PDFs. Public files, so this is mostly about what must never be in them.
# Needs poppler-utils (pdfinfo, pdftotext).
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
failed=0
fail() {
  echo "cv/check.sh: $1" >&2
  failed=1
}

for file in "$root"/site/public/cv/Vedad_Dizdarevic_CV_EN.pdf "$root"/site/public/cv/Vedad_Dizdarevic_CV_DE.pdf; do
  name=$(basename "$file")
  [ -s "$file" ] || { fail "$name is missing"; continue; }

  pages=$(pdfinfo "$file" | awk '/^Pages:/ {print $2}')
  [ "$pages" = 2 ] || fail "$name has $pages pages, want 2"
  pdfinfo "$file" | grep -q '^Title: *Vedad Dizdarević' || fail "$name has no title"
  pdfinfo "$file" | grep -q '^Tagged: *yes' || fail "$name is not tagged"

  text=$(pdftotext -layout "$file" -)
  printf '%s' "$text" | grep -q 'hello@vedad-dizdarevic.dev' || fail "$name has no contact address"
  # Phone numbers, private mail providers, a date of birth.
  if printf '%s' "$text" | grep -Eiq '(\+|00)[0-9]{2}[ -]?[0-9]{3,}|@(gmail|gmx|web|yahoo|outlook|hotmail)\.|(date of birth|geburtsdatum|geboren am)'; then
    fail "$name contains private contact details"
  fi
done

exit "$failed"
