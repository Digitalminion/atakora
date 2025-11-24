# REST API Design Documentation

**Navigation**: [Architecture](../../README.md) > [Design](../README.md) > REST API

---

## Overview

Design specifications for REST API implementation in Atakora, including OpenAPI integration, ARM template mapping, and synthesis strategies.

## Design Documents

### Core Design
- [REST API ARM Mapping](./REST-API-ARM-Mapping.md) - Mapping REST resources to ARM templates
- [REST API CLI Design](./REST-API-CLI-Design.md) - Command-line interface for REST API operations
- [REST API Implementation Summary](./REST-API-Implementation-Summary.md) - Implementation overview and status
- [REST API Synthesis](./REST-API-Synthesis.md) - Template generation for REST APIs

### OpenAPI Integration
- [OpenAPI Library Evaluation](./OPENAPI-LIBRARY-EVALUATION.md) - Comparison of OpenAPI parsing libraries

## Key Features

### OpenAPI Support
- Import OpenAPI 3.0 specifications
- Generate TypeScript types from schemas
- Create Azure API Management configurations

### Resource Mapping
Direct mapping between REST constructs and Azure resources:
- API Management Services
- Function Apps for serverless APIs
- App Service for containerized APIs

### Synthesis Strategy
REST APIs are synthesized to ARM templates with:
- API definitions
- Security policies
- Rate limiting
- CORS configuration

## See Also

- [ADR-015: REST API Architecture](../../decisions/ADR-015-REST-API-ARCHITECTURE.md)
- [ADR-016: REST Advanced Features](../../decisions/ADR-016-REST-ADVANCED-FEATURES.md)
- [REST API Guide](../../../../guides/rest-api.md)
- [OpenAPI Integration Guide](../../../../guides/openapi-integration.md)

---

**Last Updated**: 2025-11-24