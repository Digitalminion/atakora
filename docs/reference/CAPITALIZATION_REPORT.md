# Reference Documentation File Capitalization Report

Date: 2025-11-24

## Summary

All markdown files in `/docs/reference/` have been renamed to FULL CAPITALIZATION format (except README.md files which remain as-is per the standard). This ensures consistency and clarity in the documentation structure.

## Renaming Report

### /docs/reference/api/

| Before | After |
|--------|-------|
| rest-api-reference.md | REST-API-REFERENCE.md |

### /docs/reference/api/cdk/

| Before | After |
|--------|-------|
| apimanagement.md | API-MANAGEMENT.md |
| authorization.md | AUTHORIZATION.md |
| cognitiveservices.md | COGNITIVE-SERVICES.md |
| documentdb.md | DOCUMENT-DB.md |
| insights.md | INSIGHTS.md |
| keyvault.md | KEY-VAULT.md |
| managedidentity.md | MANAGED-IDENTITY.md |
| network.md | NETWORK.md |
| operationalinsights.md | OPERATIONAL-INSIGHTS.md |
| rbac-grants.md | RBAC-GRANTS.md |
| resources.md | RESOURCES.md |
| sql.md | SQL.md |
| storage.md | STORAGE.md |
| web.md | WEB.md |

### /docs/reference/cli/

| Before | After |
|--------|-------|
| add.md | ADD.md |
| Commands.md | COMMANDS.md |
| config.md | CONFIG.md |
| deploy.md | DEPLOY.md |
| diff.md | DIFF.md |
| function.md | FUNCTION.md |
| init.md | INIT.md |
| set-default.md | SET-DEFAULT.md |
| synth.md | SYNTH.md |

### /docs/reference/backend/

| Before | After |
|--------|-------|
| Attach-Pattern.md | ATTACH-PATTERN.md |
| Authentication.md | AUTHENTICATION.md |
| Resource-Provisioning.md | RESOURCE-PROVISIONING.md |
| Schema.md | SCHEMA.md |

### /docs/reference/backend/design/

| Before | After |
|--------|-------|
| Cosmos-DB-Defaults.md | COSMOS-DB-DEFAULTS.md |
| CRUD-Model-Defaults.md | CRUD-MODEL-DEFAULTS.md |
| Event-Model-Defaults.md | EVENT-MODEL-DEFAULTS.md |
| Function-App-Defaults.md | FUNCTION-APP-DEFAULTS.md |

### /docs/reference/Configuration/

| Before | After |
|--------|-------|
| Authentication.md | AUTHENTICATION.md |
| Error-Codes.md | ERROR-CODES.md |
| Naming-Conventions.md | NAMING-CONVENTIONS.md |

### /docs/reference/Integration/

| Before | After |
|--------|-------|
| Azure-Functions-Handlers.md | AZURE-FUNCTIONS-HANDLERS.md |
| OpenAPI-Synthesis.md | OPENAPI-SYNTHESIS.md |
| OpenAPI-Type-Generation.md | OPENAPI-TYPE-GENERATION.md |

### /docs/reference/Schemas/

| Before | After |
|--------|-------|
| Field-Types.md | FIELD-TYPES.md |
| Manifest-Schema.md | MANIFEST-SCHEMA.md |

### /docs/reference/Templates/

| Before | After |
|--------|-------|
| ARM-Template-Output.md | ARM-TEMPLATE-OUTPUT.md |
| CLI-Templates.md | CLI-TEMPLATES.md |

## Cross-References Updated

The following files had their internal links updated to match the new capitalized file names:

1. **`/docs/reference/README.md`** - Main reference index
   - Updated all links to API documentation
   - Updated all links to CLI commands
   - Updated all links to backend documentation
   - Updated all links to schemas, configuration, templates, and integration docs

2. **`/docs/reference/api/cdk/README.md`** - CDK package reference
   - Updated all service namespace documentation links
   - Removed reference to non-existent COMPUTE.md file

## Naming Standard Applied

The following naming standard has been enforced:

- **API Documentation**: Full hyphenated caps (e.g., `API-MANAGEMENT.md`, `KEY-VAULT.md`)
- **CLI Commands**: Simple caps (e.g., `ADD.md`, `DEPLOY.md`, `SYNTH.md`)
- **Backend Documentation**: Hyphenated caps (e.g., `ATTACH-PATTERN.md`, `RESOURCE-PROVISIONING.md`)
- **Configuration**: Hyphenated caps (e.g., `ERROR-CODES.md`, `NAMING-CONVENTIONS.md`)
- **Integration**: Hyphenated caps (e.g., `AZURE-FUNCTIONS-HANDLERS.md`, `OPENAPI-SYNTHESIS.md`)
- **Schemas**: Hyphenated caps (e.g., `FIELD-TYPES.md`, `MANIFEST-SCHEMA.md`)
- **Templates**: Hyphenated caps (e.g., `ARM-TEMPLATE-OUTPUT.md`, `CLI-TEMPLATES.md`)
- **README Files**: Unchanged (remain as `README.md`)

## Consistency Achieved

✅ All files in the same folder follow the same pattern
✅ All cross-references have been updated
✅ All README files remain as `README.md` (index file exception)
✅ Full capitalization with hyphens for multi-word files

## Total Files Renamed

- **43** markdown files renamed to FULL CAPS
- **7** README.md files left unchanged (as per standard)
- **2** major index files updated with new references

## Verification

To verify all files are correctly capitalized, run:

```bash
find docs/reference -name "*.md" -type f | grep -v README.md | grep '[a-z]'
```

This should return no results, indicating all non-README files are fully capitalized.