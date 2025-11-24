# Week 2 Examples

Working examples demonstrating Week 2 features: Service Registry, Function Handlers, and Token Validation.

## Examples

### 1. Custom Service - Email with SendGrid

**File:** `custom-service-email.ts`

Demonstrates how to create a custom service and use it in function handlers.

**Features:**
- Email service interface definition
- SendGrid implementation
- Service factory function
- Backend registration
- Multiple function handlers using the service
- Mock implementation for testing

**Function Handlers:**
- `sendWelcomeEmail` - Send welcome email to new users
- `sendNewsletter` - Send batch emails to subscribers
- `sendPasswordReset` - Send templated password reset emails

**Key Concepts:**
- Defining service interfaces
- Implementing services
- Creating service factories
- Registering services with backend
- Using `context.services` in handlers
- Testing with mocks

**Usage:**

```typescript
// Use in function
export const sendWelcome: FunctionHandler = async (context, input) => {
  await context.services.emailService.send({
    to: input.email,
    subject: 'Welcome!',
    body: 'Thanks for joining.',
  });
};
```

**Testing:**

```typescript
// Mock for testing
const mockEmailService = new MockEmailService();
const context = createFunctionContext({
  services: { emailService: mockEmailService },
});

await sendWelcomeEmail(context, input);
expect(mockEmailService.sentEmails).toHaveLength(1);
```

### 2. Service Composition

**File:** `service-composition.ts`

Demonstrates orchestrating multiple services in a single function handler.

**Services:**
- `DataValidator` - Validate data against schemas
- `DataTransformer` - Transform and normalize data
- `NotificationService` - Send notifications (email, SMS, etc.)
- `AuditLogger` - Log audit events

**Function Handler:**
- `processDataImport` - Complete data import workflow

**Workflow:**
1. Validate incoming data with DataValidator
2. Transform valid records with DataTransformer
3. Store records in database
4. Send completion notification
5. Log audit trail

**Key Concepts:**
- Using multiple services together
- Error handling across services
- Transaction-like patterns
- Service coordination
- Comprehensive logging

**Usage:**

```typescript
export const processDataImport: FunctionHandler = async (context, input) => {
  // Validate
  const validation = await context.services.dataValidator.validateBatch(
    input.records,
    schema
  );

  // Transform
  for (const record of validRecords) {
    const transformed = await context.services.dataTransformer.normalize(record);
    await context.database.importedRecords.create({ data: transformed });
  }

  // Notify
  await context.services.notificationService.notify(
    'email',
    context.user.email,
    { message: 'Import complete' }
  );

  // Audit
  await context.services.auditLogger.log({
    action: 'data.import',
    outcome: 'success',
  });
};
```

## Running Examples

### Install Dependencies

```bash
npm install @sendgrid/mail @azure/search-documents
```

### Environment Variables

```bash
# For email service example
export SENDGRID_API_KEY=your-sendgrid-api-key
export FROM_EMAIL=noreply@example.com

# For authentication
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
export AZURE_AUDIENCE=api://your-app
```

### Run Tests

```bash
# Run all tests
npm test examples/week2

# Run specific example
npm test examples/week2/custom-service-email.ts
npm test examples/week2/service-composition.ts
```

## Key Takeaways

### Service Registry
- Services enable code reuse across functions
- Type-safe dependency injection
- Easy to test with mocks
- Singleton and transient lifecycles

### Function Handlers
- Clean separation of concerns
- Access to database, storage, services via context
- Comprehensive error handling
- Easy to test with createFunctionContext

### Best Practices
1. Define service interfaces (not just classes)
2. Use factory functions for configuration
3. Keep services focused (single responsibility)
4. Provide mock implementations for testing
5. Log important events
6. Handle errors gracefully
7. Validate input early

## Related Documentation

- [Service Registry Guide](../../docs/guides/service-registry.md)
- [Function Handlers Guide](../../docs/guides/function-handlers.md)
- [Token Validation Guide](../../docs/guides/token-validation.md)
- [Testing Guide](../../docs/guides/testing.md)

## Need Help?

- Check the [troubleshooting guides](../../docs/troubleshooting/)
- Review the [comprehensive guides](../../docs/guides/)
- See [API reference](../../docs/api/)
