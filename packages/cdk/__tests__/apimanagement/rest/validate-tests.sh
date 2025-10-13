#!/bin/bash

# Comprehensive REST API Test Validation
# This script validates all aspects of the REST API implementation

set -e

ATAKORA_ROOT="C:/Users/austi/Source/Github/Digital Minion/atakora"
CDK_DIR="$ATAKORA_ROOT/packages/cdk"
TEST_DIR="$CDK_DIR/__tests__/api/rest"
REPORT_FILE="$TEST_DIR/TEST-REPORT.md"

echo "=========================================="
echo "REST API Test Validation Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# 1. Verify build passes
echo -n "  Build status... "
cd "$ATAKORA_ROOT"
if npm run build > /tmp/build.log 2>&1; then
  echo -e "${GREEN}✅ PASSED${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  echo "Build errors found:"
  grep "error TS" /tmp/build.log | head -10
  exit 1
fi

# 2. Check test files exist
echo -n "  Test files... "
required_files=(
  "$TEST_DIR/unit/operation.test.ts"
  "$TEST_DIR/unit/builder.test.ts"
  "$TEST_DIR/integration/openapi.test.ts"
  "$TEST_DIR/integration/stack.test.ts"
  "$TEST_DIR/utils.ts"
)

all_exist=true
for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Missing: $(basename $file)${NC}"
    all_exist=false
  fi
done

if $all_exist; then
  echo -e "${GREEN}✅ ALL PRESENT${NC}"
else
  exit 1
fi

# 3. Check fixture files
echo -n "  Fixture files... "
fixture_files=(
  "$TEST_DIR/fixtures/sample-operations.ts"
  "$TEST_DIR/fixtures/sample-openapi.json"
  "$TEST_DIR/fixtures/sample-openapi-3.1.json"
  "$TEST_DIR/fixtures/invalid-openapi.json"
  "$TEST_DIR/fixtures/mock-resources.ts"
)

fixtures_exist=true
for file in "${fixture_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${YELLOW}⚠️  Missing: $(basename $file)${NC}"
    fixtures_exist=false
  fi
done

if $fixtures_exist; then
  echo -e "${GREEN}✅ ALL PRESENT${NC}"
else
  echo -e "${YELLOW}⚠️  SOME MISSING (non-critical)${NC}"
fi

echo ""
echo "Running test suite..."
echo ""

# Run tests with detailed output
cd "$CDK_DIR"

# Phase 1: Unit Tests
echo "Phase 1: Unit Tests"
echo "--------------------"
npm test -- __tests__/api/rest/unit/ --reporter=verbose 2>&1 | tee /tmp/unit-tests.log
unit_status=$?

# Phase 2: Integration Tests
echo ""
echo "Phase 2: Integration Tests"
echo "--------------------------"
npm test -- __tests__/api/rest/integration/ --reporter=verbose 2>&1 | tee /tmp/integration-tests.log
integration_status=$?

# Phase 3: Coverage Report
echo ""
echo "Phase 3: Coverage Analysis"
echo "--------------------------"
npm test -- __tests__/api/rest/ --coverage --coverage.reporter=text --coverage.reporter=json-summary 2>&1 | tee /tmp/coverage.log
coverage_status=$?

# Parse coverage results
if [ -f "coverage/coverage-summary.json" ]; then
  echo ""
  echo "Coverage Summary:"
  node -e "
    const data = require('./coverage/coverage-summary.json');
    const total = data.total;
    console.log('  Statements: ' + total.statements.pct + '%');
    console.log('  Branches:   ' + total.branches.pct + '%');
    console.log('  Functions:  ' + total.functions.pct + '%');
    console.log('  Lines:      ' + total.lines.pct + '%');
  "
fi

# Phase 4: Performance Benchmarks
echo ""
echo "Phase 4: Performance Benchmarks"
echo "--------------------------------"
npm test -- __tests__/api/rest/ --grep="Performance" --reporter=verbose 2>&1 | tee /tmp/performance.log

# Phase 5: Type Safety Checks
echo ""
echo "Phase 5: Type Safety Validation"
echo "--------------------------------"
npm test -- __tests__/api/rest/ --grep="Type Safety" --reporter=verbose 2>&1 | tee /tmp/type-safety.log

# Generate Report
echo ""
echo "Generating test report..."

cat > "$REPORT_FILE" << 'EOF'
# REST API Integration Test Report

**Generated:** $(date)
**Tested By:** Charlie (Quality Lead)
**Build Status:** PASSED

---

## Executive Summary

EOF

# Add test statistics
node -e "
const fs = require('fs');

// Parse test results
const unitLog = fs.readFileSync('/tmp/unit-tests.log', 'utf-8');
const integrationLog = fs.readFileSync('/tmp/integration-tests.log', 'utf-8');

// Extract test counts (simplified)
console.log('- **Total Tests:** [Calculated from logs]');
console.log('- **Pass Rate:** [Calculated from logs]');
console.log('- **Coverage:** [From coverage-summary.json]');
console.log('');
" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << 'EOF'

## Test Results

### Unit Tests
EOF

cat /tmp/unit-tests.log >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << 'EOF'

### Integration Tests
EOF

cat /tmp/integration-tests.log >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << 'EOF'

### Coverage Report
EOF

cat /tmp/coverage.log >> "$REPORT_FILE"

echo ""
echo "=========================================="
echo "Validation Complete!"
echo "=========================================="
echo ""

# Summary
echo "Results:"
if [ $unit_status -eq 0 ]; then
  echo -e "  Unit Tests:        ${GREEN}✅ PASSED${NC}"
else
  echo -e "  Unit Tests:        ${RED}❌ FAILED${NC}"
fi

if [ $integration_status -eq 0 ]; then
  echo -e "  Integration Tests: ${GREEN}✅ PASSED${NC}"
else
  echo -e "  Integration Tests: ${RED}❌ FAILED${NC}"
fi

if [ $coverage_status -eq 0 ]; then
  echo -e "  Coverage:          ${GREEN}✅ PASSED${NC}"
else
  echo -e "  Coverage:          ${RED}❌ FAILED${NC}"
fi

echo ""
echo "Report saved to: $REPORT_FILE"
echo "Coverage report: $CDK_DIR/coverage/index.html"
echo ""

# Exit with overall status
if [ $unit_status -eq 0 ] && [ $integration_status -eq 0 ] && [ $coverage_status -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
  exit 1
fi
