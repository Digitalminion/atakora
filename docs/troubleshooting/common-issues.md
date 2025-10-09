# Common Issues

**Navigation**: [Docs Home](../README.md) > [Troubleshooting](./README.md) > Common Issues

---

## Installation Issues

### Cannot Find Module '@atakora/lib'

**Error**:
```
Cannot find module '@atakora/lib'
```

**Cause**: Package not installed

**Solution**:
```bash
npm install @atakora/lib @atakora/cdk
```

### Permission Denied

**Error**:
```
EACCES: permission denied
```

**Solution**:
```bash
# Fix npm permissions (Unix/Linux/Mac)
sudo chown -R $(whoami) ~/.npm

# Or use npx
npx atakora init
```

## Authentication Issues

### Authentication Failed

**Error**:
```
Authentication failed: AADSTS700016
```

**Solutions**:

1. **Configure credentials**:
   ```bash
   atakora config set-credentials
   ```

2. **Use Azure CLI**:
   ```bash
   az login
   az account set --subscription "Production"
   ```

3. **Check environment variables**:
   ```bash
   echo $AZURE_TENANT_ID
   echo $AZURE_CLIENT_ID
   echo $AZURE_SUBSCRIPTION_ID
   ```

### Token Expired

**Error**:
```
Token has expired
```

**Solution**:
```bash
# Re-login
az login

# Or refresh service principal
atakora config set-credentials
```

## Synthesis Issues

### TypeScript Compilation Errors

**Error**:
```
TS2304: Cannot find name 'process'
```

**Solutions**:

1. **Install type definitions**:
   ```bash
   npm install --save-dev @types/node
   ```

2. **Update tsconfig.json**:
   ```json
   {
     "compilerOptions": {
       "types": ["node"]
     }
   }
   ```

### Validation Errors

**Error**:
```
Validation failed: Missing required property 'addressSpace'
```

**Solution**: Add required properties:
```typescript
new VirtualNetwork(this, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }  // Required
});
```

### Circular Dependencies

**Error**:
```
Circular dependency detected
```

**Solution**: Check resource references and break circular dependencies

## Deployment Issues

### Resource Already Exists

**Error**:
```
StorageAccountAlreadyTaken
```

**Solutions**:

1. **Use different name**:
   ```typescript
   const storage = new StorageAccount(this, 'Storage', {
     name: 'stnewname'
   });
   ```

2. **Delete existing resource**:
   ```bash
   az storage account delete --name stoldname --resource-group rg-name
   ```

### Template Validation Failed

**Error**:
```
Template validation failed
```

**Solutions**:

1. **Check ARM template**:
   ```bash
   cat .atakora/arm.out/production/template.json | jq .
   ```

2. **Validate manually**:
   ```bash
   az deployment group validate \
     --resource-group rg-name \
     --template-file .atakora/arm.out/production/template.json
   ```

### Permission Denied

**Error**:
```
AuthorizationFailed
```

**Solution**: Request proper Azure RBAC role:
```bash
az role assignment create \
  --role Contributor \
  --assignee <user-or-sp> \
  --subscription $AZURE_SUBSCRIPTION_ID
```

## Naming Issues

### Name Too Long

**Error**:
```
Name exceeds maximum length
```

**Solution**: Shorten identifier:
```typescript
// Too long
const storage = new StorageAccount(this, 'VeryLongStorageAccountName', {});

// Fixed
const storage = new StorageAccount(this, 'Storage', {});
```

### Invalid Characters

**Error**:
```
Name contains invalid characters
```

**Solution**: Use only allowed characters:
```typescript
// Invalid
const storage = new StorageAccount(this, 'My_Storage', {});

// Valid
const storage = new StorageAccount(this, 'MyStorage', {});
```

## Runtime Errors

### Undefined Reference

**Error**:
```
Cannot resolve reference to undefined resource
```

**Solution**: Ensure resource exists before referencing:
```typescript
const rg = new ResourceGroup(this, 'RG', {});

// Now reference it
const vnet = new VirtualNetwork(this, 'VNet', {
  resourceGroup: rg  // Must be defined first
});
```

### Environment Variable Not Set

**Error**:
```
process.env.SQL_PASSWORD is undefined
```

**Solution**:
```bash
# Set environment variable
export SQL_PASSWORD="YourSecurePassword123!"

# Or use .env file
echo "SQL_PASSWORD=YourSecurePassword123!" > .env
```

## See Also

- [Debugging Synthesis](./debugging-synthesis.md)
- [Deployment Failures](./deployment-failures.md)
- [CI/CD Problems](./ci-cd-problems.md)

---

**Last Updated**: 2025-10-08
