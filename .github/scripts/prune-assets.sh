#!/usr/bin/env bash
# Deletes hashed assets under _astro/ that the current build no longer contains and that are
# older than DAYS. Deploys never delete them (cached HTML from the previous deploy still points
# at the old ones), so without this the prefix only grows. An unchanged asset is not re-uploaded
# by `s3 sync`, so its date is its first upload; one still in the build is never touched.
# The bucket is versioned: a wrong delete can be undone for 30 days.
#
# Usage: prune-assets.sh <bucket> <dist/_astro dir> [days=30]   (DRY_RUN=1 only lists)
set -euo pipefail

bucket=${1:?bucket}
dir=${2:?dist/_astro directory}
days=${3:-30}

if [ -z "$(find "$dir" -type f -print -quit 2>/dev/null)" ]; then
  echo "refusing to prune: $dir has no files, so every asset would look unused" >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

find "$dir" -type f -printf '_astro/%P\n' | sort > "$work/current"
cutoff=$(date -u -d "$days days ago" +%Y-%m-%dT%H:%M:%S+00:00)

aws s3api list-objects-v2 --bucket "$bucket" --prefix _astro/ \
  --query 'Contents[].[Key,LastModified]' --output text | awk 'NF == 2' | sort > "$work/remote"

# Remote objects that are not in the build and were last modified before the cutoff.
awk -F'\t' -v cutoff="$cutoff" 'NR == FNR { keep[$0]; next } !($1 in keep) && $2 < cutoff { print $1 }' \
  "$work/current" "$work/remote" > "$work/stale"

echo "in bucket: $(wc -l < "$work/remote"), in build: $(wc -l < "$work/current"), stale (not in build, older than $days days): $(wc -l < "$work/stale")"

while IFS= read -r key; do
  if [ "${DRY_RUN:-}" = 1 ]; then
    echo "would delete $key"
  else
    aws s3 rm "s3://$bucket/$key" --only-show-errors
    echo "deleted $key"
  fi
done < "$work/stale"
