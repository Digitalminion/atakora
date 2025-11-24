#!/bin/bash

# Validation Script for Documentation Cross-References
# Checks that all markdown links point to existing files

set -e

DOCS_DIR="/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora/docs"
ERRORS=0
WARNINGS=0
CHECKED=0

echo "Validating Documentation Cross-References"
echo "========================================="
echo ""

# Function to check if link target exists
check_link() {
    local source_file="$1"
    local link_path="$2"
    local source_dir=$(dirname "$source_file")

    # Skip external links
    if [[ "$link_path" =~ ^https?:// ]] || [[ "$link_path" =~ ^mailto: ]]; then
        return 0
    fi

    # Skip anchors
    if [[ "$link_path" == "#"* ]]; then
        return 0
    fi

    # Remove anchor from path
    link_path="${link_path%%#*}"

    # Resolve relative path
    if [[ "$link_path" == /* ]]; then
        # Absolute path
        target_file="$link_path"
    else
        # Relative path
        target_file="$(cd "$source_dir" && realpath -m "$link_path" 2>/dev/null || echo "$source_dir/$link_path")"
    fi

    ((CHECKED++))

    if [[ ! -f "$target_file" ]]; then
        echo "❌ BROKEN: $(basename "$source_file") -> $link_path"
        ((ERRORS++))
        return 1
    fi

    # Check if link uses old lowercase name
    local base_name=$(basename "$link_path")
    if [[ "$base_name" != "README.md" ]] && [[ "$base_name" =~ [a-z] ]] && [[ "$base_name" != *"."* || "$base_name" == *.md ]]; then
        echo "⚠️  WARNING: $(basename "$source_file") -> $link_path (should be capitalized)"
        ((WARNINGS++))
    fi

    return 0
}

# Process all markdown files
find "$DOCS_DIR" -type f -name "*.md" | while read -r file; do
    # Extract markdown links
    grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$file" 2>/dev/null | while read -r link; do
        # Extract path from link
        path=$(echo "$link" | sed -E 's/\[[^\]]+\]\(([^)]+)\)/\1/')
        check_link "$file" "$path"
    done
done

echo ""
echo "========================================="
echo "Validation Complete"
echo "  Links checked: $CHECKED"
echo "  Broken links: $ERRORS"
echo "  Warnings: $WARNINGS"
echo "========================================="

if [[ $ERRORS -gt 0 ]]; then
    echo ""
    echo "❌ Found $ERRORS broken cross-references!"
    exit 1
else
    echo ""
    echo "✅ All cross-references are valid!"
fi