# Prompt: Fix Phase 2 Critical Security Issues

Copy and paste this entire prompt to a new Claude Code session:

---

I'm working on the Atakora project (Azure backend framework) and need help fixing **critical security vulnerabilities** in Phase 2 (Authentication System).

## ⚠️ CRITICAL: Security Context

**Project Location**: `/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora`

**Current Status**:

- ✅ Phase 1 (Schema System): Complete, Grade A (92/100)
- ✅ Phase 2 (Authentication): Complete, Grade A+ (96/100), **but has security vulnerabilities**
- 🚨 **BLOCKING PRODUCTION DEPLOYMENT** - P0 security issues must be fixed

## Critical Security Vulnerabilities Identified

A critical security review (by Becky, our Staff Architect) identified **3 P0 (must-fix) security vulnerabilities** and **3 P1 (important) security issues**:

### 🚨 P0 - Critical Security Vulnerabilities:

#### Issue 1: JWT Signature Validation Vulnerability (CRITICAL)

**File**: `START3.md` - Improvement #1
**Problem**: `validateJwtSignature()` is a stub that ALWAYS returns valid. Anyone can forge tokens with admin privileges.
**Security Impact**: Complete authentication bypass - attackers can create tokens with arbitrary claims
**Effort**: 1 day

#### Issue 2: API Key Storage Security

**File**: `START3.md` - Improvement #2
**Problem**: API keys stored in plain text in memory, vulnerable to logs/dumps
**Security Impact**: API keys can be exposed through logs, error messages, or memory dumps
**Effort**: 1 day

#### Issue 3: Missing Rate Limiting

**File**: `START3.md` - Improvement #3
**Problem**: No protection against brute force attacks on authentication endpoints
**Security Impact**: Attackers can attempt unlimited authentication attempts
**Effort**: 0.5 days

### ⚠️ P1 - Important Security Issues:

#### Issue 4: Token Expiration Handling

**File**: `START3.md` - Improvement #4
**Problem**: Missing exp claims treated as "never expires", no clock skew tolerance
**Security Impact**: Tokens could be valid indefinitely, replay attacks possible
**Effort**: 0.5 days

#### Issue 5: Session Security Configuration

**File**: `START3.md` - Improvement #5
**Problem**: Missing httpOnly, secure flags, session fingerprinting
**Security Impact**: Session hijacking, XSS attacks, CSRF vulnerabilities
**Effort**: 0.5 days

#### Issue 6: No Audit Logging

**File**: `START3.md` - Improvement #6
**Problem**: Complete absence of security event tracking
**Security Impact**: Cannot detect or investigate security incidents
**Effort**: 1 day

**Total Estimated Effort for P0**: ~2.5 days
**Total Estimated Effort for P0+P1**: ~4.5 days

## What I Need You To Do

1. **Read the critical security review**:
   - Open and read `/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora/START3.md`
   - Understand all P0 and P1 security improvements in detail
   - **Pay special attention to security implications**

2. **Review the current Phase 2 implementation**:
   - Located in: `packages/component/src/auth/`
   - Key files: `token-validator.ts`, `providers/`, `session.ts`, `user-context.ts`
   - Look for other potential security issues not yet identified

3. **Create a detailed security fix plan**:
   - Break down each P0 improvement into specific tasks
   - Assign tasks to Devon agents (Devon-Security-1, Devon-Security-2, etc.)
   - **Prioritize security fixes** - P0 must be done, P1 strongly recommended
   - Include security testing for each fix

4. **Spawn Devon agents to implement the security fixes**:
   - Launch multiple Devon agents where appropriate
   - Each agent should tackle specific security issues
   - **Security-first approach** - correct implementation over backward compatibility
   - Include comprehensive security tests

5. **Coordinate security work**:
   - Track progress with TodoWrite tool
   - Run security-focused tests after each fix
   - Consider spawning a Felix agent for schema validation if needed
   - Document all security changes clearly

## Success Criteria

After the security fixes are complete:

- ✅ **All P0 security vulnerabilities fixed** (required for production)
- ✅ JWT signature validation actually validates signatures using proper crypto
- ✅ API keys encrypted or secured in memory
- ✅ Rate limiting implemented for auth endpoints
- ✅ Token expiration properly validated with clock skew tolerance
- ✅ Session security flags (httpOnly, secure) properly set
- ✅ Audit logging in place for security events
- ✅ All existing Phase 2 tests still pass (~583 tests)
- ✅ New security tests added for each vulnerability
- ✅ Test coverage remains >90%
- ✅ **Security review completed** - no known exploitable vulnerabilities

## Critical Security Notes

⚠️ **IMPORTANT SECURITY CONSIDERATIONS**:

1. **JWT Validation is Critical**:
   - Must use proper cryptographic libraries (`jose` or `jsonwebtoken`)
   - Must verify signature against public keys
   - Must validate issuer, audience, expiration
   - Must handle key rotation

2. **API Key Security**:
   - Consider using environment variables only
   - Hash API keys before storing
   - Use constant-time comparison for validation
   - Consider key rotation mechanism

3. **Rate Limiting**:
   - Implement sliding window or token bucket algorithm
   - Consider distributed rate limiting for production
   - Different limits for different auth methods
   - Log rate limit violations

4. **Session Security**:
   - httpOnly flag prevents XSS attacks
   - secure flag ensures HTTPS-only transmission
   - SameSite attribute prevents CSRF
   - Session fingerprinting (IP, User-Agent) helps detect hijacking

5. **Audit Logging**:
   - Log all authentication attempts (success and failure)
   - Log token validation failures
   - Log rate limit violations
   - Include timestamp, IP, user agent, user ID
   - **Never log secrets** (tokens, API keys, passwords)

## Breaking Changes Acceptable

⚠️ **Security trumps backward compatibility**. If a security fix requires breaking changes:

- Document them clearly
- Provide migration guide
- Mark old APIs as deprecated
- **But fix the security issue properly**

## Files to Reference

- `START3.md` - Detailed security improvement report with all vulnerabilities
- `packages/component/PHASE2_REVIEW.md` - Phase 2 review (gave it A+)
- `packages/component/PHASE2_SUMMARY.md` - Phase 2 summary
- `packages/component/src/auth/` - Current Phase 2 implementation

## External Dependencies Needed

For JWT signature validation, you'll likely need to add:

- `jose` (modern, recommended) or `jsonwebtoken` (classic)
- For rate limiting: Consider in-memory implementation first, can add Redis later

## Agent Specializations

- **Devon agents**: Implementation work, security fixes
- **Charlie agents**: Security testing, penetration testing validation
- **Felix agents**: If schema validation needed for auth configs
- **Becky agents**: For complex security architecture decisions

## Expected Deliverables

1. **Security Fix Plan** - Detailed breakdown of how you'll fix each vulnerability
2. **Implementation** - Code changes for all P0 (and ideally P1) security issues
3. **Security Tests** - Tests that validate vulnerabilities are fixed
4. **Penetration Test Report** - Evidence that vulnerabilities can't be exploited
5. **Security Documentation** - Security best practices guide for users
6. **Migration Guide** - Document any breaking changes
7. **Security Audit Report** - Final status confirming all vulnerabilities fixed

## Security Testing Requirements

For each fix, include tests that:

- ✅ Demonstrate the vulnerability is fixed
- ✅ Try to exploit the old vulnerability (should fail)
- ✅ Validate secure configuration works
- ✅ Test edge cases (expired tokens, invalid signatures, etc.)
- ✅ Performance test rate limiting

## Start Command

Begin by reading START3.md and creating a comprehensive security fix plan. Then spawn the appropriate Devon agents to implement the security fixes.

**REMEMBER**: This is security-critical work. The system cannot go to production with these vulnerabilities. Be thorough, test extensively, and prioritize security over convenience.

---

**Ready?** Please start by reading START3.md and telling me your security fix plan for these critical vulnerabilities.
