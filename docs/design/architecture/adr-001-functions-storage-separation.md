# ADR-001: Azure Functions App Storage Separation

## Context

The Azure Functions App in the backend package (`packages/backend/src/index.ts`) is currently configured to reuse the storage account created for data services. This approach was likely chosen to reduce the number of storage accounts and potentially save costs. However, this design violates several architectural principles and causes operational issues.

### Current Implementation
- Line 110 in `packages/backend/src/index.ts` passes `data.storage.storageAccount` as `existingStorage` to the Functions App
- The data storage account is configured with private endpoints for blob storage
- This storage account is intended for application data, not Functions runtime operations

### Problems with Current Approach
1. **Separation of Concerns Violation**: Mixing application data with Functions runtime storage
2. **Security Boundaries**: Functions runtime storage contains sensitive operational data (keys, secrets, state)
3. **Performance Isolation**: Functions can generate significant I/O that impacts data operations
4. **Configuration Conflicts**: Data storage is optimized for blob access, Functions need queue/table/blob
5. **Deployment Issues**: Functions require specific storage configuration that conflicts with data storage setup

## Decision

**Azure Functions Apps MUST use dedicated storage accounts for their runtime operations.**

The FunctionsApp component should be modified to:
1. Always create its own dedicated storage account
2. Remove the `existingStorage` parameter as it represents an anti-pattern
3. Configure storage specifically for Functions requirements (queues, tables, blobs)

## Alternatives Considered

### Alternative 1: Shared Storage with Separate Containers
- **Approach**: Use the same storage account but separate containers
- **Rejected Because**:
  - Still violates separation of concerns
  - Performance impact remains
  - Security boundaries are weak
  - Configuration conflicts persist

### Alternative 2: Storage Account per Environment Type
- **Approach**: One storage for dev/test, dedicated for production
- **Rejected Because**:
  - Inconsistent behavior across environments
  - Issues discovered late in deployment pipeline
  - Complicates environment promotion

### Alternative 3: Configurable Storage Strategy
- **Approach**: Allow choice between dedicated or shared storage
- **Rejected Because**:
  - Adds unnecessary complexity
  - No valid use case for sharing Functions runtime storage
  - Increases testing surface area

## Consequences

### Positive
- **Clear Separation**: Functions runtime isolated from application data
- **Better Security**: Runtime secrets and state isolated in dedicated storage
- **Performance Isolation**: Functions I/O doesn't impact data operations
- **Simplified Configuration**: Each storage account optimized for its purpose
- **Easier Troubleshooting**: Clear ownership and boundaries

### Negative
- **Additional Resources**: One more storage account per Functions App
- **Slightly Higher Cost**: ~$20/month for additional storage account
- **More ARM Resources**: Increases template complexity slightly

### Implementation Impact
- **FunctionsApp Component**: Remove `existingStorage` parameter
- **Backend Package**: Stop passing storage to Functions App
- **Testing**: Update tests to verify dedicated storage creation
- **Documentation**: Update patterns to reflect this requirement

## Success Criteria

1. **Deployment Success**: Functions App deploys successfully without storage conflicts
2. **Resource Isolation**: Functions storage account separate from data storage in ARM templates
3. **No Shared Dependencies**: Functions App can be deleted without impacting data storage
4. **Performance Metrics**: No cross-contamination of I/O metrics between Functions and data
5. **Security Scanning**: Functions storage passes security scans for runtime requirements

## Government vs Commercial Cloud Considerations

Both Government and Commercial clouds require this separation equally:
- Government clouds have stricter compliance requirements that benefit from isolation
- Commercial clouds have higher scale requirements that benefit from performance isolation
- Storage account limits and features are consistent across both environments

## References

- [Azure Functions Storage Considerations](https://docs.microsoft.com/azure/azure-functions/storage-considerations)
- [Azure Functions Best Practices](https://docs.microsoft.com/azure/azure-functions/functions-best-practices)
- [Storage Account Performance Tiers](https://docs.microsoft.com/azure/storage/common/storage-account-overview)

## Status

**Accepted** - Implementation required immediately to unblock deployments

## Date

2024-10-13