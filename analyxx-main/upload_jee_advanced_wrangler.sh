#!/bin/bash
# Upload JEE Advanced papers to Cloudflare R2 via Wrangler CLI (REMOTE).
# Uses --remote flag to ensure uploads go to the actual R2 bucket.
#
# Usage:
#   bash upload_jee_advanced_wrangler.sh           # Upload all
#   bash upload_jee_advanced_wrangler.sh --dry-run  # Preview only

set -euo pipefail

BUCKET="analyxx-papers"
SRC_DIR="papers_to_upload/JEE Advanced"
R2_PREFIX="library-papers/jee-advanced/Paper"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo ""
echo "🎓 JEE Advanced → Cloudflare R2 Upload (via Wrangler --remote)"
echo "   Source: $SRC_DIR"
echo "   Bucket: $BUCKET"
echo "   R2 prefix: $R2_PREFIX"
echo ""

uploaded=0
failed=0
total=0

for year in $(seq 2007 2026); do
  for paper in 1 2; do
    local_file="$SRC_DIR/jee_advanced_${year}_paper${paper}.pdf"
    r2_key="${R2_PREFIX}/${year}_paper${paper}.pdf"
    total=$((total + 1))

    if [[ ! -f "$local_file" ]]; then
      echo "  [$total/40] ⚠️  Missing: $local_file"
      failed=$((failed + 1))
      continue
    fi

    size=$(stat -f%z "$local_file" 2>/dev/null || stat -c%s "$local_file" 2>/dev/null || echo "?")

    if $DRY_RUN; then
      echo "  [$total/40] 📋 Would upload: $r2_key ($size bytes)"
      continue
    fi

    printf "  [%d/40] 📤 %d Paper %d... " "$total" "$year" "$paper"
    
    if npx wrangler r2 object put "${BUCKET}/${r2_key}" --file "$local_file" --content-type "application/pdf" --remote > /dev/null 2>&1; then
      echo "✅ ($size bytes)"
      uploaded=$((uploaded + 1))
    else
      echo "❌"
      failed=$((failed + 1))
    fi
    
    # Brief delay every 10 uploads
    if (( total % 10 == 0 )); then
      sleep 1
    fi
  done
done

echo ""
if $DRY_RUN; then
  echo "📋 [DRY RUN] Would upload $total papers"
else
  echo "🎉 Done! ✅ $uploaded uploaded | ❌ $failed failed | Total: $total"
fi
