# Microsoft.Web Migration Status

## Completion: 50%

### Migrated Resources

#### Sites (Microsoft.Web/sites) - App Services
- **Status**: ✅ Complete
- **Files Created**:
  - `site-types.ts` - Type definitions
  - `site-arm.ts` - L1 ARM construct (ArmSites)
  - `sites.ts` - L2 intent-based construct (Sites)
- **Features**:
  - Type-safe interfaces using @atakora/lib imports
  - ARM plural naming (Sites)
  - Comprehensive TSDoc comments
  - ValidationResult-based ARM validation
  - Helper methods: `addAppSetting()`, `addConnectionString()`, `enableVNetIntegration()`
  - Static import method: `fromSiteId()`
  - References IServerFarm interface for App Service Plan dependencies
  - Sensible defaults (HTTPS only, system-assigned identity, TLS 1.2, FTPS disabled)

### Pending Resources

#### ServerFarms (Microsoft.Web/serverfarms) - App Service Plans
- **Status**: ⏳ Pending
- **Source Files**: `packages/lib/src/resources/app-service-plan/`
- **Target Files**:
  - `server-farm-types.ts` - Type definitions (placeholder created)
  - `server-farm-arm.ts` - L1 ARM construct (ArmServerFarms) - TODO
  - `server-farms.ts` - L2 intent-based construct (ServerFarms) - TODO
- **Dependencies**: None
- **Estimated Effort**: 2 hours

### Exports (Partial)
Current exports via `index.ts`:
- ✅ `ArmSites`, `Sites`
- ✅ `ArmSitesProps`, `SitesProps`, `ISite`
- ✅ Enums: `AppServiceKind`, `ManagedIdentityType`, `FtpsState`, `MinTlsVersion`, `ConnectionStringType`
- ⏳ `IServerFarm` (placeholder only)
- ❌ `ArmServerFarms`, `ServerFarms` - TODO

### Next Steps

1. **Complete ServerFarms Migration**:
   - Copy and transform app-service-plan types
   - Update class names to ARM plural (ServerFarms)
   - Update all imports to @atakora/lib
   - Add validateArmStructure() method
   - Create comprehensive exports in index.ts

2. **Testing**:
   - Verify Sites can reference ServerFarms via IServerFarm interface
   - Test auto-naming for both resources
   - Validate ARM template generation

### Migration Date
- Sites: 2025-10-08
- ServerFarms: Pending

### Migrated By
Devon (Construct Developer)
