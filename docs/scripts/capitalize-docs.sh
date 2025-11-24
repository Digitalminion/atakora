#!/bin/bash

# Full Capitalization Documentation Renaming Script
# This script renames all documentation files to follow FULL CAPS naming convention

set -e

DOCS_DIR="/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora/docs"

echo "Starting documentation capitalization..."
echo "========================================"

# Counter for renamed files
RENAMED_COUNT=0
SKIPPED_COUNT=0

# Function to convert filename to full caps
capitalize_name() {
    local file="$1"
    local dir=$(dirname "$file")
    local base=$(basename "$file" .md)

    # Skip README files
    if [[ "$base" == "README" ]]; then
        echo "  Skipping: $file (README exception)"
        ((SKIPPED_COUNT++))
        return
    fi

    # Convert to uppercase with hyphens
    local new_base=$(echo "$base" | sed 's/\([a-z]\)\([A-Z]\)/\1-\2/g' | tr '[:lower:]' '[:upper:]')

    # Handle special cases for ADRs
    if [[ "$base" =~ ^adr-[0-9]+ ]] || [[ "$base" =~ ^ADR-[0-9]+ ]]; then
        # Already has ADR prefix, just uppercase everything
        new_base=$(echo "$base" | tr '[:lower:]' '[:upper:]')
    fi

    local new_file="$dir/${new_base}.md"

    # Only rename if different
    if [[ "$file" != "$new_file" ]]; then
        echo "  Renaming: $(basename "$file") -> $(basename "$new_file")"
        git mv "$file" "$new_file" 2>/dev/null || mv "$file" "$new_file"
        ((RENAMED_COUNT++))
    else
        ((SKIPPED_COUNT++))
    fi
}

# Process files in batches by directory
process_directory() {
    local dir="$1"
    local pattern="$2"

    echo ""
    echo "Processing: $dir"
    echo "----------------------------------------"

    find "$dir" -type f -name "*.md" | while read -r file; do
        capitalize_name "$file"
    done
}

# Process each major directory
process_directory "$DOCS_DIR/contributing" "standard"
process_directory "$DOCS_DIR/internal/analysis" "standard"
process_directory "$DOCS_DIR/internal/migration" "standard"
process_directory "$DOCS_DIR/internal/planning" "standard"
process_directory "$DOCS_DIR/internal/tasks" "standard"
process_directory "$DOCS_DIR/internal/fixes" "standard"
process_directory "$DOCS_DIR/internal/archive" "standard"

echo ""
echo "========================================"
echo "Documentation Capitalization Complete!"
echo "  Files renamed: $RENAMED_COUNT"
echo "  Files skipped: $SKIPPED_COUNT"
echo "========================================"