# Contributing to Atakora

**Navigation**: [Docs Home](../README.md) > Contributing

---

## Welcome!

Thank you for your interest in contributing to Atakora! This guide will help you get started with development, testing, and contributing code.

## Quick Start

```bash
# Clone repository
git clone https://github.com/Digital-Minion/atakora.git
cd atakora

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Make your changes
code .
```

## Ways to Contribute

### Reporting Bugs

Found a bug? Please [create an issue](https://github.com/Digital-Minion/atakora/issues/new) with:
- Clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Version information
- Code samples (if applicable)

### Suggesting Enhancements

Have an idea? [Open a feature request](https://github.com/Digital-Minion/atakora/issues/new) with:
- Use case description
- Proposed solution
- Alternatives considered
- Example code (if applicable)

### Contributing Code

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

See [PR Process](./pr-process.md) for details.

### Improving Documentation

Documentation improvements are always welcome:
- Fix typos
- Clarify explanations
- Add examples
- Update outdated content

## Development Guides

- **[Development Setup](./development-setup.md)** - Configure your environment
- **[Testing Guide](./testing-guide.md)** - Write and run tests
- **[PR Process](./pr-process.md)** - Submit pull requests
- **[Release Process](./release-process.md)** - Release workflow

## Code Standards

### TypeScript

- Use strict TypeScript mode
- No implicit `any`
- Prefer interfaces over types for public APIs
- Export all public interfaces

### Code Style

- Use Prettier for formatting
- Use ESLint for linting
- Follow existing patterns
- Write self-documenting code

### Documentation

- TSDoc comments for all public APIs
- Update README when adding features
- Add examples for new functionality
- Keep docs in sync with code

### Testing

- Unit tests for all new code
- Integration tests for complex features
- Test edge cases and error conditions
- Maintain 80%+ code coverage

## Project Structure

```
atakora/
├── packages/
│   ├── lib/           # Core library
│   ├── cdk/           # Service namespaces
│   └── cli/           # CLI tools
├── docs/              # Documentation
├── examples/          # Example projects
└── scripts/           # Build scripts
```

## Communication

- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code contributions
- **Discussions**: Questions and ideas

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build great software together.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

## Questions?

- Check [existing issues](https://github.com/Digital-Minion/atakora/issues)
- Review [documentation](../README.md)
- Ask in [GitHub Discussions](https://github.com/Digital-Minion/atakora/discussions)

---

**Last Updated**: 2025-10-08
