# Atakora Documentation Standards

This document defines the standards and conventions for all Atakora documentation to ensure consistency, discoverability, and maintainability.

## Table of Contents

- [File Naming Conventions](#file-naming-conventions)
- [Directory Organization](#directory-organization)
- [Content Standards](#content-standards)
- [Cross-Referencing](#cross-referencing)
- [Adding New Documentation](#adding-new-documentation)
- [Documentation Types](#documentation-types)

## File Naming Conventions

### Standard Rules

All documentation files follow these naming conventions:

1. **Use lowercase with hyphens** for all documentation files
   - ✅ `getting-started.md`
   - ✅ `azure-functions.md`
   - ❌ `getting_started.md`
   - ❌ `GETTING_STARTED.md`

2. **Exception: Special files** that require uppercase by convention
   - `README.md` - Directory index files
   - `INDEX.md` - Documentation index
   - `GLOSSARY.md` - Terms and definitions
   - `CHANGELOG.md` - Version history

3. **ADR files** follow the pattern: `adr-{number}-{descriptive-name}.md`
   - Example: `adr-001-functions-storage-separation.md`

4. **No underscores** in public documentation
   - Internal documentation may use underscores for historical reasons
   - New files should always use hyphens

### File Name Components

```
{topic}-{subtopic}-{detail}.md
```

Examples:
- `authentication.md` - Single topic
- `authentication-entra-id.md` - Topic with subtopic
- `authentication-entra-id-setup.md` - Topic with subtopic and detail

## Directory Organization

### Main Documentation Structure

```
docs/
├── getting-started/      # Quick start guides
├── guides/               # How-to guides and tutorials
│   ├── authentication/   # Authentication guides
│   ├── fundamentals/     # Core concepts
│   ├── migration/        # Migration guides
│   ├── patterns/         # Design patterns
│   ├── tutorials/        # Step-by-step tutorials
│   ├── validation/       # Validation guides
│   └── workflows/        # Common workflows
├── reference/            # API and CLI reference
│   ├── api/             # API documentation
│   ├── backend/         # Backend reference
│   ├── cli/             # CLI commands
│   └── schema/          # Schema definitions
├── examples/            # Code examples
├── troubleshooting/     # Problem-solving guides
├── architecture/        # Architecture decisions
│   ├── decisions/       # ADRs
│   ├── design/          # Design documents
│   └── diagrams/        # Architecture diagrams
├── contributing/        # Contribution guides
└── internal/           # Internal documentation

```

### Directory Purposes

| Directory | Purpose | Audience |
|-----------|---------|----------|
| `getting-started/` | Initial setup and first steps | New users |
| `guides/` | Task-focused how-to content | All users |
| `reference/` | API and CLI documentation | Advanced users |
| `examples/` | Working code samples | All users |
| `troubleshooting/` | Problem resolution | Users with issues |
| `architecture/` | Design decisions and rationale | Contributors, architects |
| `contributing/` | Development and contribution | Contributors |
| `internal/` | Team documentation | Internal team |

## Content Standards

### Document Structure

Every documentation file should include:

1. **Title** - H1 heading matching the topic
2. **Navigation breadcrumb** - Link back to parent docs
3. **Overview** - Brief description of the content
4. **Table of Contents** - For documents > 200 lines
5. **Main content** - Organized with clear headings
6. **See Also** - Related documentation links

Template:
```markdown
# Document Title

**Navigation**: [Docs Home](../README.md) > [Parent](./README.md) > Current Page

---

## Overview

Brief description of what this document covers.

## Table of Contents

- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1

Content...

## Section 2

Content...

## See Also

- [Related Topic 1](./related-1.md)
- [Related Topic 2](./related-2.md)
```

### Writing Style

1. **Use active voice** and present tense
   - ✅ "Configure the backend using..."
   - ❌ "The backend should be configured by..."

2. **Be direct and concise**
   - Start with the most important information
   - Use bulleted lists for multiple items
   - Keep paragraphs short (3-4 sentences)

3. **Include code examples**
   - Every concept should have a working example
   - Use TypeScript for infrastructure code
   - Include all necessary imports

4. **Progressive disclosure**
   - Start with simple examples
   - Add complexity gradually
   - Link to advanced topics

## Cross-Referencing

### Internal Links

Use relative paths for all internal documentation links:

```markdown
<!-- From docs/guides/authentication.md -->
See the [Getting Started Guide](../getting-started/README.md)
```

### Link Formats

1. **Directory links** - Always link to README.md
   ```markdown
   [Guides](./guides/README.md)
   ```

2. **File links** - Include the .md extension
   ```markdown
   [Authentication](./authentication.md)
   ```

3. **Section links** - Use anchor links
   ```markdown
   [See Configuration](#configuration)
   ```

### External Links

For external resources, use absolute URLs:
```markdown
[Azure Documentation](https://docs.microsoft.com/azure)
```

## Adding New Documentation

### Process

1. **Determine the category**
   - Is it a guide, reference, or example?
   - Who is the target audience?

2. **Choose the location**
   - Place in the appropriate directory
   - Create subdirectories for related topics

3. **Follow naming conventions**
   - Use lowercase with hyphens
   - Be descriptive but concise

4. **Create the file**
   - Use the document template
   - Include navigation breadcrumbs

5. **Update indexes**
   - Add to parent directory's README.md
   - Update INDEX.md if applicable

6. **Add cross-references**
   - Link from related documents
   - Update "See Also" sections

### Checklist for New Documentation

- [ ] File name follows conventions (lowercase-with-hyphens.md)
- [ ] Placed in correct directory
- [ ] Includes navigation breadcrumb
- [ ] Has clear overview section
- [ ] Contains working code examples
- [ ] Links to related documentation
- [ ] Added to parent README.md
- [ ] Updated in INDEX.md if needed
- [ ] Reviewed for consistency

## Documentation Types

### Getting Started Guides

**Purpose**: Help new users get up and running quickly

**Structure**:
- Prerequisites
- Installation steps
- First project creation
- Basic examples
- Next steps

### How-To Guides

**Purpose**: Step-by-step instructions for specific tasks

**Structure**:
- Task overview
- Prerequisites
- Step-by-step instructions
- Verification steps
- Troubleshooting tips

### Reference Documentation

**Purpose**: Complete API and CLI documentation

**Structure**:
- Synopsis
- Parameters/Options
- Return values
- Examples
- Related commands/APIs

### Tutorials

**Purpose**: Learn by building complete projects

**Structure**:
- Learning objectives
- Prerequisites
- Progressive steps
- Complete code
- Exercises

### Troubleshooting Guides

**Purpose**: Solve common problems

**Structure**:
- Problem description
- Symptoms
- Common causes
- Solutions
- Prevention tips

### Architecture Decision Records (ADRs)

**Purpose**: Document architectural decisions

**Structure**:
- Status
- Context
- Decision
- Consequences
- Alternatives considered

## Maintenance

### Regular Reviews

- Monthly: Check for broken links
- Quarterly: Review for accuracy
- Annually: Audit organization structure

### Deprecation Process

1. Mark as deprecated with notice
2. Provide migration path
3. Keep for 2 releases minimum
4. Move to archive directory
5. Remove after grace period

## Version History

- **2024-11-24**: Initial documentation standards established
- Standardized on lowercase-with-hyphens naming
- Defined directory organization
- Created documentation templates

## Questions?

For questions about documentation standards, please:
1. Check existing documentation for examples
2. Ask in the team chat
3. Submit a PR with proposed changes

---

**Last Updated**: November 24, 2024