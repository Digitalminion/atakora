# Reference Documentation

Technical reference documentation for Atakora's APIs, schemas, and tooling.

## CLI Reference

- [CLI Commands](./cli/README.md) - Complete CLI command documentation
- [init](./cli/init.md) - Initialize a new Atakora project
- [add](./cli/add.md) - Add resources to your infrastructure
- [synth](./cli/synth.md) - Synthesize ARM templates
- [deploy](./cli/deploy.md) - Deploy infrastructure to Azure
- [diff](./cli/diff.md) - Preview infrastructure changes
- [config](./cli/config.md) - Configure project settings
- [set-default](./cli/set-default.md) - Set default subscription and resource group

## API Reference

- [Core API](./api/core/README.md) - Core constructs and base classes
- [CDK Resources](./api/cdk/) - Azure resource constructs
  - [Network](./api/cdk/network.md)
  - [Storage](./api/cdk/storage.md)
  - [Web](./api/cdk/web.md)
  - [Insights](./api/cdk/insights.md)
  - [Key Vault](./api/cdk/keyvault.md)
  - [API Management](./api/cdk/apimanagement.md)
  - [Cognitive Services](./api/cdk/cognitiveservices.md)
  - [Managed Identity](./api/cdk/managedidentity.md)
  - [Authorization](./api/cdk/authorization.md)

## OpenAPI & REST APIs

- **[OpenAPI Type Generation](./openapi-type-generation.md)** - Technical reference for TypeScript type generation from OpenAPI schemas
- **[OpenAPI Synthesis Library](./openapi-synthesis.md)** - API reference for the OpenAPI synthesis library
- [Azure Functions Handlers](./azure-functions-handlers.md) - Handler type reference

## Schemas

- [Manifest Schema](./manifest-schema.md) - Project manifest configuration reference
- [Error Codes](./error-codes.md) - Complete error code index
- [Naming Conventions](./naming-conventions.md) - Azure resource naming rules and patterns

## Templates & Output

- [ARM Template Output](./arm-template-output.md) - Understanding generated ARM templates
- [CLI Templates](./cli-templates.md) - Template reference for code generation

## Related Documentation

See also:

- [Getting Started Guides](../getting-started/README.md)
- [User Guides](../guides/README.md)
- [Examples](../examples/README.md)
- [Architecture Documentation](../architecture/README.md)
