# REST API ARM Template Mapping Reference

> **Note**: This is a technical reference document previously located in `packages/lib/src/synthesis/rest/ARM-MAPPING.md`.

## Overview

This document provides the authoritative reference for mapping `IRestOperation` TypeScript interfaces to Azure API Management ARM template resources. Use this as the specification when implementing synthesis logic.

## Core Mapping: IRestOperation → ARM Operation

### TypeScript Input Example

```typescript
const getUserOperation: IRestOperation = {
  method: 'GET',
  path: '/users/{userId}',
  operationId: 'getUser',
  summary: 'Get user by ID',
  description: 'Retrieves a single user by their unique identifier',
  tags: ['users', 'read'],
  pathParameters: {
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'User unique identifier'
        }
      },
      required: ['userId']
    }
  },
  queryParameters: {
    schema: {
      type: 'object',
      properties: {
        includeDeleted: {
          type: 'boolean',
          default: false
        }
      }
    }
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      }
    },
    404: {
      description: 'User not found'
    }
  },
  backend: {
    type: 'azureFunction',
    functionApp: userFunctionApp,
    functionName: 'GetUser'
  }
};
```

### ARM Template Output

```json
{
  "type": "Microsoft.ApiManagement/service/apis/operations",
  "apiVersion": "2021-08-01",
  "name": "[concat(parameters('apiManagementServiceName'), '/', parameters('apiName'), '/getUser')]",
  "properties": {
    "displayName": "Get user by ID",
    "method": "GET",
    "urlTemplate": "/users/{userId}",
    "description": "Retrieves a single user by their unique identifier",
    "templateParameters": [
      {
        "name": "userId",
        "description": "User unique identifier",
        "type": "string",
        "required": true,
        "values": []
      }
    ],
    "request": {
      "queryParameters": [
        {
          "name": "includeDeleted",
          "description": "",
          "type": "boolean",
          "defaultValue": "false",
          "required": false,
          "values": []
        }
      ]
    },
    "responses": [
      {
        "statusCode": 200,
        "description": "User found",
        "representations": [
          {
            "contentType": "application/json",
            "schemaId": null,
            "typeName": null
          }
        ],
        "headers": []
      },
      {
        "statusCode": 404,
        "description": "User not found",
        "representations": [],
        "headers": []
      }
    ]
  },
  "dependsOn": [
    "[resourceId('Microsoft.ApiManagement/service/apis', parameters('apiManagementServiceName'), parameters('apiName'))]"
  ]
}
```

## Field-by-Field Mapping Table

| IRestOperation Field | ARM Field | Transformation Logic |
|---------------------|-----------|---------------------|
| `method` | `properties.method` | Direct copy (GET, POST, etc.) |
| `path` | `properties.urlTemplate` | Direct copy (must use {param} syntax) |
| `operationId` | ARM resource name component | Sanitize for ARM naming rules |
| `summary` | `properties.displayName` | Direct copy, fallback to operationId |
| `description` | `properties.description` | Direct copy |
| `pathParameters` | `properties.templateParameters` | See Path Parameters section |
| `queryParameters` | `properties.request.queryParameters` | See Query Parameters section |
| `headerParameters` | `properties.request.headers` | See Header Parameters section |
| `requestBody` | `properties.request.representations` | See Request Body section |
| `responses` | `properties.responses` | See Response section |
| `backend` | Separate policy resource | See Backend Mapping section |
| `policies` | Separate policy resource | See Policy Mapping section |
| `tags` | Not mapped to ARM | Used for OpenAPI export only |
| `deprecated` | Not mapped to ARM | Used for OpenAPI export only |

## Path Parameters Mapping

### Input Format
```typescript
pathParameters: {
  schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
        pattern: '^[0-9a-f]{8}-...'
      },
      version: {
        type: 'string',
        enum: ['v1', 'v2'],
        default: 'v1'
      }
    },
    required: ['userId']
  }
}
```

### Output Format
```json
{
  "templateParameters": [
    {
      "name": "userId",
      "description": "User ID",
      "type": "string",
      "required": true,
      "values": []
    },
    {
      "name": "version",
      "description": "",
      "type": "string",
      "required": false,
      "defaultValue": "v1",
      "values": ["v1", "v2"]
    }
  ]
}
```

### Mapping Rules
- Extract parameter names from `path` using regex: `/{([^}]+)}/g`
- Match each path param to `pathParameters.schema.properties[name]`
- `required` = true for all path parameters (ARM requirement)
- `type` maps from JSON Schema to ARM type (string, number, boolean)
- `enum` maps to `values` array
- `default` maps to `defaultValue`
- `pattern`, `format` are not mapped (validation only at build time)

## Query Parameters Mapping

### Input Format
```typescript
queryParameters: {
  schema: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 10
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0
      },
      sort: {
        type: 'string',
        enum: ['asc', 'desc']
      }
    },
    required: ['limit']
  }
}
```

### Output Format
```json
{
  "request": {
    "queryParameters": [
      {
        "name": "limit",
        "description": "",
        "type": "integer",
        "required": true,
        "defaultValue": "10",
        "values": []
      },
      {
        "name": "offset",
        "description": "",
        "type": "integer",
        "required": false,
        "defaultValue": "0",
        "values": []
      },
      {
        "name": "sort",
        "description": "",
        "type": "string",
        "required": false,
        "values": ["asc", "desc"]
      }
    ]
  }
}
```

### Mapping Rules
- Iterate `queryParameters.schema.properties`
- `required` from `queryParameters.schema.required` array
- `type` maps from JSON Schema to ARM (string, integer, boolean, array)
- `enum` maps to `values`
- `default` maps to `defaultValue` (convert to string)
- `minimum`, `maximum` not mapped (validation only)

## Header Parameters Mapping

### Input Format
```typescript
headerParameters: {
  schema: {
    type: 'object',
    properties: {
      'X-Request-ID': {
        type: 'string',
        format: 'uuid'
      },
      'X-API-Version': {
        type: 'string',
        default: '2023-01-01'
      }
    }
  }
}
```

### Output Format
```json
{
  "request": {
    "headers": [
      {
        "name": "X-Request-ID",
        "description": "",
        "type": "string",
        "required": false,
        "values": []
      },
      {
        "name": "X-API-Version",
        "description": "",
        "type": "string",
        "required": false,
        "defaultValue": "2023-01-01",
        "values": []
      }
    ]
  }
}
```

### Mapping Rules
- Same as query parameters
- Header names are case-insensitive but preserve casing
- `required` typically false for headers

## Request Body Mapping

### Input Format
```typescript
requestBody: {
  description: 'User creation data',
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      },
      examples: {
        example1: {
          value: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      }
    },
    'application/xml': {
      schema: {
        type: 'object',
        xml: { name: 'User' }
      }
    }
  }
}
```

### Output Format
```json
{
  "request": {
    "description": "User creation data",
    "representations": [
      {
        "contentType": "application/json",
        "schemaId": "User-Schema-v1",
        "typeName": "User",
        "sample": "{\"name\":\"John Doe\",\"email\":\"john@example.com\"}"
      },
      {
        "contentType": "application/xml",
        "schemaId": "User-Schema-v1",
        "typeName": "User"
      }
    ]
  }
}
```

### Mapping Rules
- Iterate `requestBody.content` keys (content types)
- Each content type becomes a representation
- `schemaId`: Reference to registered schema (if using API Management schema registry)
- `typeName`: Extracted from schema title or inferred
- `sample`: First example value serialized as string
- Schema validation happens at build time, not in ARM template

## Response Mapping

### Input Format
```typescript
responses: {
  200: {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    },
    headers: {
      'X-Rate-Limit-Remaining': {
        schema: { type: 'integer' },
        description: 'Number of requests remaining'
      }
    }
  },
  400: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  },
  404: {
    description: 'Not Found'
  }
}
```

### Output Format
```json
{
  "responses": [
    {
      "statusCode": 200,
      "description": "Success",
      "representations": [
        {
          "contentType": "application/json",
          "schemaId": null,
          "typeName": null
        }
      ],
      "headers": [
        {
          "name": "X-Rate-Limit-Remaining",
          "description": "Number of requests remaining",
          "type": "integer",
          "required": false,
          "values": []
        }
      ]
    },
    {
      "statusCode": 400,
      "description": "Bad Request",
      "representations": [
        {
          "contentType": "application/json",
          "schemaId": null,
          "typeName": null
        }
      ],
      "headers": []
    },
    {
      "statusCode": 404,
      "description": "Not Found",
      "representations": [],
      "headers": []
    }
  ]
}
```

### Mapping Rules
- Iterate response status codes
- `statusCode`: Numeric HTTP status code
- `description`: Response description
- `representations`: Same as request body mapping
- `headers`: Same as header parameters mapping
- Responses without content have empty `representations` array

## Backend Mapping

### Azure Function Backend

#### Input
```typescript
backend: {
  type: 'azureFunction',
  functionApp: userFunctionApp,
  functionName: 'GetUser',
  authLevel: 'function',
  timeout: 30
}
```

#### Backend Resource Output
```json
{
  "type": "Microsoft.ApiManagement/service/backends",
  "apiVersion": "2021-08-01",
  "name": "[concat(parameters('apiManagementServiceName'), '/backend-GetUser')]",
  "properties": {
    "title": "GetUser Function",
    "description": "Azure Function backend for GetUser operation",
    "protocol": "http",
    "url": "[concat('https://', reference(resourceId('Microsoft.Web/sites', parameters('functionAppName'))).defaultHostName, '/api')]",
    "resourceId": "[concat('https://management.azure.com', resourceId('Microsoft.Web/sites', parameters('functionAppName')))]",
    "credentials": {
      "header": {
        "x-functions-key": "[listKeys(resourceId('Microsoft.Web/sites/host', parameters('functionAppName'), 'default'), '2021-02-01').functionKeys.default]"
      }
    },
    "tls": {
      "validateCertificateChain": true,
      "validateCertificateName": true
    }
  },
  "dependsOn": [
    "[resourceId('Microsoft.Web/sites', parameters('functionAppName'))]"
  ]
}
```

#### Policy Resource Output
```json
{
  "type": "Microsoft.ApiManagement/service/apis/operations/policies",
  "apiVersion": "2021-08-01",
  "name": "[concat(parameters('apiManagementServiceName'), '/', parameters('apiName'), '/getUser/policy')]",
  "properties": {
    "value": "<policies>\n  <inbound>\n    <base />\n    <set-backend-service backend-id=\"backend-GetUser\" />\n  </inbound>\n  <backend>\n    <base />\n  </backend>\n  <outbound>\n    <base />\n  </outbound>\n  <on-error>\n    <base />\n  </on-error>\n</policies>",
    "format": "xml"
  },
  "dependsOn": [
    "[resourceId('Microsoft.ApiManagement/service/apis/operations', parameters('apiManagementServiceName'), parameters('apiName'), 'getUser')]",
    "[resourceId('Microsoft.ApiManagement/service/backends', parameters('apiManagementServiceName'), 'backend-GetUser')]"
  ]
}
```

### App Service Backend

#### Input
```typescript
backend: {
  type: 'appService',
  appService: webAppConstruct,
  relativePath: '/api/v1',
  timeout: 60
}
```

#### Output
```json
{
  "type": "Microsoft.ApiManagement/service/backends",
  "apiVersion": "2021-08-01",
  "name": "[concat(parameters('apiManagementServiceName'), '/backend-webapp')]",
  "properties": {
    "title": "Web App Backend",
    "protocol": "http",
    "url": "[concat('https://', reference(resourceId('Microsoft.Web/sites', parameters('appServiceName'))).defaultHostName, '/api/v1')]",
    "resourceId": "[concat('https://management.azure.com', resourceId('Microsoft.Web/sites', parameters('appServiceName')))]",
    "credentials": {
      "certificate": [],
      "query": {},
      "header": {},
      "authorization": {
        "scheme": "None"
      }
    }
  }
}
```

### HTTP Endpoint Backend

#### Input
```typescript
backend: {
  type: 'httpEndpoint',
  url: 'https://api.external.com/v1',
  credentials: {
    type: 'apiKey',
    apiKey: '[parameters(\'externalApiKey\')]',
    header: 'X-API-Key'
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000
  }
}
```

#### Output
```json
{
  "type": "Microsoft.ApiManagement/service/backends",
  "apiVersion": "2021-08-01",
  "name": "[concat(parameters('apiManagementServiceName'), '/backend-external')]",
  "properties": {
    "title": "External HTTP Backend",
    "protocol": "http",
    "url": "https://api.external.com/v1",
    "credentials": {
      "header": {
        "X-API-Key": "[parameters('externalApiKey')]"
      }
    },
    "circuitBreaker": {
      "rules": [
        {
          "failureCondition": {
            "count": 5,
            "interval": "PT30S",
            "statusCodeRanges": [
              {
                "min": 500,
                "max": 599
              }
            ]
          },
          "tripDuration": "PT30S"
        }
      ]
    }
  }
}
```

## Type Conversion Reference

### JSON Schema to ARM Type

| JSON Schema | ARM Type | Notes |
|------------|----------|-------|
| `string` | `string` | Direct mapping |
| `number` | `number` | Direct mapping |
| `integer` | `integer` | Preserve integer distinction |
| `boolean` | `boolean` | Direct mapping |
| `array` | `array` | Direct mapping |
| `object` | `object` | For complex parameters |
| `null` | Not supported | Use `nullable: true` instead |

### Content Type Mapping

| OpenAPI Content Type | ARM Representation |
|---------------------|-------------------|
| `application/json` | `contentType: "application/json"` |
| `application/xml` | `contentType: "application/xml"` |
| `application/x-www-form-urlencoded` | `contentType: "application/x-www-form-urlencoded"` |
| `multipart/form-data` | `contentType: "multipart/form-data"` |
| `text/plain` | `contentType: "text/plain"` |
| `application/octet-stream` | `contentType: "application/octet-stream"` |

## ARM Naming Conventions

### Resource Naming Rules

1. **Operation Name**: `{apiManagementService}/{apiName}/{operationId}`
   - Must be alphanumeric, hyphens, underscores only
   - Sanitize operationId: Replace non-alphanumeric with underscore
   - Example: `my-apim/users-api/get_user_by_id`

2. **Backend Name**: `{apiManagementService}/backend-{backendId}`
   - Keep backend-id unique across API
   - Example: `my-apim/backend-user-function`

3. **Policy Name**: `{apiManagementService}/{apiName}/{operationId}/policy`
   - Always singular "policy" suffix
   - Example: `my-apim/users-api/get_user/policy`

### Common ARM Expressions

```javascript
// Function App URL
"[concat('https://', reference(resourceId('Microsoft.Web/sites', parameters('functionAppName'))).defaultHostName, '/api')]"

// Function Key
"[listKeys(resourceId('Microsoft.Web/sites/host', parameters('functionAppName'), 'default'), '2021-02-01').functionKeys.default]"

// Resource ID
"[resourceId('Microsoft.ApiManagement/service/apis', parameters('apiManagementServiceName'), parameters('apiName'))]"

// Conditional
"[if(parameters('enableCors'), 'true', 'false')]"

// Parameter Reference
"[parameters('parameterName')]"

// Variable Reference
"[variables('variableName')]"
```

## Edge Cases

### Missing Operation ID

```typescript
if (!operation.operationId) {
  // Generate from method and path
  operation.operationId = `${operation.method.toLowerCase()}_${sanitizePath(operation.path)}`;
}

function sanitizePath(path: string): string {
  return path
    .replace(/^\//, '')           // Remove leading slash
    .replace(/\//g, '_')          // Replace slashes with underscores
    .replace(/[{}]/g, '')         // Remove braces
    .replace(/[^a-zA-Z0-9_]/g, '_'); // Replace invalid chars
}
```

### Empty Responses

```typescript
// Operation must have at least one response for ARM
if (!operation.responses || Object.keys(operation.responses).length === 0) {
  operation.responses = {
    200: { description: 'Success' }
  };
}
```

### Path Parameter Mismatch

```typescript
// Validate path params match URL template
const pathParams = extractPathParams(operation.path); // ['userId', 'postId']
const definedParams = Object.keys(operation.pathParameters?.schema.properties || {});

for (const param of pathParams) {
  if (!definedParams.includes(param)) {
    throw new SynthesisError(
      `Path parameter '${param}' in URL template '${operation.path}' is not defined in pathParameters`,
      { path: `operations.${operation.operationId}.pathParameters` }
    );
  }
}
```

## Validation Checklist

Before emitting ARM resources, validate:

- [ ] Operation ID is unique within the API
- [ ] Path template uses `{param}` syntax (not `:param` or `<param>`)
- [ ] All path parameters in URL are defined in `pathParameters`
- [ ] At least one response is defined
- [ ] Content types are valid MIME types
- [ ] Backend references exist if specified
- [ ] Policy XML is well-formed
- [ ] ARM resource names follow Azure naming rules
- [ ] Dependencies are correctly specified

## References

- Azure API Management ARM Schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.apimanagement/service/apis/operations
- API Management Backend Schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.apimanagement/service/backends
- API Management Policy Reference: https://learn.microsoft.com/en-us/azure/api-management/api-management-policies
- ARM Template Functions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions

---

**Document Type**: Technical Reference
**Last Updated**: 2025-10-10
**Version**: 1.0
