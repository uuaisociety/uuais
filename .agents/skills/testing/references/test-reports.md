# Test Reports

## Template

```markdown
# Test Report: {Feature Name}

**Date**: YYYY-MM-DD
**Version**: {App Version}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | X |
| Passed | X |
| Failed | X |
| Skipped | X |
| Coverage | X% |

## Findings

### [CRITICAL] {Issue Title}
- **Location**: src/file.ts:45
- **Impact**: Security/data loss/system crash
- **Fix**: Description

### [HIGH] {Issue Title}
- **Impact**: Major functionality broken

### [MEDIUM] {Issue Title}
- **Impact**: Feature partially working

### [LOW] {Issue Title}
- **Impact**: Minor/cosmetic

## Coverage Analysis

| Module | Lines | Branches | Functions |
|--------|-------|----------|-----------|
| api/ | 85% | 78% | 90% |
| services/ | 92% | 85% | 95% |

### Gaps
- `src/api/admin.ts` — 0% (no tests)

## Recommendations
1. **Immediate**: Fix critical issue
2. **High**: Address coverage gaps
3. **Medium**: Add error path tests
4. **Low**: Increase branch coverage
```

## Severity

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Security, data loss, system crash |
| **HIGH** | Major functionality broken |
| **MEDIUM** | Workaround exists |
| **LOW** | Minor/cosmetic |
