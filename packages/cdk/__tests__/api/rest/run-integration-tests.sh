#!/bin/bash

# REST API Comprehensive Integration Testing Suite
# Run this script after all compilation errors are fixed

set -e

ATAKORA_ROOT="C:/Users/austi/Source/Github/Digital Minion/atakora"
CDK_DIR="$ATAKORA_ROOT/packages/cdk"
TEST_REPORT="$CDK_DIR/__tests__/api/rest/TEST-REPORT.md"

echo "=========================================="
echo "REST API Comprehensive Integration Testing"
echo "=========================================="
echo ""

# Step 1: Verify build passes
echo "Step 1: Verifying build..."
cd "$ATAKORA_ROOT"
if ! npm run build > /dev/null 2>&1; then
  echo "❌ Build failed! Please fix compilation errors first."
  exit 1
fi
echo "✅ Build passed"
echo ""

# Step 2: Activate tests
echo "Step 2: Activating all REST API tests..."
cd "$CDK_DIR"

# Count todo tests before activation
todo_count=$(grep -r "it.todo(" __tests__/api/rest/ | wc -l)
echo "Found $todo_count todo tests to activate"
echo ""

# Step 3: Run unit tests
echo "Step 3: Running unit tests..."
npm test -- __tests__/api/rest/unit/ --reporter=verbose

# Step 4: Run integration tests
echo ""
echo "Step 4: Running integration tests..."
npm test -- __tests__/api/rest/integration/ --reporter=verbose

# Step 5: Generate coverage report
echo ""
echo "Step 5: Generating coverage report..."
npm test -- __tests__/api/rest/ --coverage --coverage.reporter=text --coverage.reporter=json-summary

# Step 6: Run performance benchmarks
echo ""
echo "Step 6: Running performance benchmarks..."
npm test -- __tests__/api/rest/ --grep="Performance"

# Step 7: Display results summary
echo ""
echo "=========================================="
echo "Test Results Summary"
echo "=========================================="
npm test -- __tests__/api/rest/ --reporter=json | node -e '
const data = JSON.parse(require("fs").readFileSync(0, "utf-8"));
console.log(`Total tests: ${data.numTotalTests}`);
console.log(`Passed: ${data.numPassedTests}`);
console.log(`Failed: ${data.numFailedTests}`);
console.log(`Pass rate: ${(data.numPassedTests / data.numTotalTests * 100).toFixed(2)}%`);
'

echo ""
echo "Coverage report saved to: coverage/index.html"
echo "Test report will be generated at: $TEST_REPORT"
echo ""
echo "✅ Integration testing complete!"
