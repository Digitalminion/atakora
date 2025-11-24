# DOCUMENTATION STANDARDS

## File Naming Convention

This project enforces **FULL CAPITALIZATION** for all documentation filenames to ensure consistency, improve discoverability, and make the documentation structure immediately clear.

### Standard Rules

1. **ALL documentation files use FULL CAPS with hyphens**: `AZURE-FUNCTIONS.md`, `COMMON-ISSUES.md`

2. **ADR (Architecture Decision Records)**: `ADR-001-TITLE.md`, `ADR-002-TITLE.md`
   - Format: `ADR-{number}-{TITLE-IN-CAPS}.md`
   - Numbers are zero-padded to 3 digits
   - Title describes the decision in caps

3. **Numbered sequences for ordered content**: `001-INSTALLATION.md`, `002-QUICKSTART.md`
   - Used in tutorials, getting-started guides
   - Numbers indicate reading/execution order

4. **Date-based files**: `SPRINT-REPORT-2025-11-24.md`
   - Dates in YYYY-MM-DD format
   - Full description in caps

5. **ONLY EXCEPTION**: `README.md`
   - Index files remain as `README.md` for tool compatibility
   - This is the only lowercase exception

### Directory-Specific Patterns

#### `/docs/architecture/decisions/`
- Main ADRs: `ADR-XXX-TITLE.md`
- Supporting docs: `TITLE-IN-CAPS.md`

#### `/docs/guides/`
- Guide files: `GUIDE-NAME.md`
- Pattern docs: `PATTERN-NAME.md`

#### `/docs/reference/`
- API docs: `API-REFERENCE.md`
- CLI docs: `CLI-COMMAND.md`

#### `/docs/internal/`
- Analysis: `ANALYSIS-NAME.md`
- Tasks: `TASK-DESCRIPTION.md`
- Planning: `PLAN-NAME.md`

### Benefits

1. **Consistency**: Single standard across all documentation
2. **Visibility**: Capital letters make files stand out
3. **Professionalism**: Shows attention to detail
4. **Searchability**: Easier to grep/find files
5. **No Ambiguity**: Clear what is documentation vs code

### Enforcement

- Git hooks validate naming on commit
- CI/CD checks enforce standards
- Regular audits ensure compliance
- Documentation generators expect this format

### Migration

All existing documentation has been migrated to this standard. When adding new documentation:

1. Use FULL CAPS with hyphens for spaces
2. Follow directory-specific patterns
3. Keep names descriptive but concise
4. Use README.md for indexes only

### Tools

The project includes tools for maintaining standards:

- `/docs/scripts/capitalize-docs.sh` - Batch rename files to caps
- `/docs/scripts/validate-docs.sh` - Check naming compliance
- `/docs/scripts/fix-references.sh` - Update cross-references

### Examples

✅ **Correct**:
- `AZURE-FUNCTIONS-GUIDE.md`
- `ADR-001-VALIDATION-ARCHITECTURE.md`
- `REST-API-TROUBLESHOOTING.md`
- `README.md` (index only)

❌ **Incorrect**:
- `azure-functions-guide.md`
- `adr-001-validation-architecture.md`
- `RestApiTroubleshooting.md`
- `readme.md`

### Cross-References

When linking to documentation files in markdown:

```markdown
<!-- Use the actual capitalized filename -->
See [Azure Functions Guide](./AZURE-FUNCTIONS-GUIDE.md)
See [ADR-001](./architecture/decisions/ADR-001-VALIDATION-ARCHITECTURE.md)
```

### IDE Configuration

Configure your IDE to recognize caps documentation:

**VS Code** - Add to settings.json:
```json
{
  "files.associations": {
    "**/docs/**/*.md": "markdown"
  }
}
```

### Exceptions Process

Any exceptions to these standards must:
1. Be documented in this file
2. Have clear technical justification
3. Be approved by team lead

Current exceptions:
- `README.md` files only

---

*Last Updated: 2025-11-24*
*Standard Version: 1.0*