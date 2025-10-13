#!/bin/bash

# Automatically activate all REST API tests
# This converts it.todo() to it() in all test files

set -e

CDK_DIR="C:/Users/austi/Source/Github/Digital Minion/atakora/packages/cdk"
TEST_DIR="$CDK_DIR/__tests__/api/rest"

echo "=========================================="
echo "Activating REST API Tests"
echo "=========================================="
echo ""

# Files to activate
files=(
  "$TEST_DIR/unit/builder.test.ts"
  "$TEST_DIR/integration/openapi.test.ts"
  "$TEST_DIR/integration/stack.test.ts"
)

# Count todos before
echo "Current status:"
for file in "${files[@]}"; do
  filename=$(basename "$file")
  count=$(grep -c "it.todo(" "$file" || echo "0")
  echo "  $filename: $count todo tests"
done

echo ""
read -p "Activate all tests? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Activating tests..."

# Activate tests (convert it.todo to it)
for file in "${files[@]}"; do
  filename=$(basename "$file")

  # Use sed to replace it.todo( with it(
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/it\.todo(/it(/g' "$file"
  else
    # Linux/Git Bash
    sed -i 's/it\.todo(/it(/g' "$file"
  fi

  activated=$(grep -c "it.todo(" "$file" || echo "0")
  total=$(grep -c "^\s*it(" "$file" || echo "0")
  echo "  ✅ $filename: $total active tests, $activated remaining todos"
done

echo ""
echo "Test activation complete!"
echo ""
echo "Next steps:"
echo "  1. Uncomment imports in test files"
echo "  2. Run: npm test -- __tests__/api/rest/"
echo "  3. Fix any failing tests"
echo ""
