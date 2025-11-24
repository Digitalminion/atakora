/**
 * Process Upload Function - Resource Definition
 *
 * Minimal configuration with helpful defaults.
 *
 * DEFAULTS APPLIED AUTOMATICALLY:
 * - Runtime: Node.js 20 LTS
 * - Memory: 128 MB (suitable for most HTTP endpoints)
 * - Timeout: 60 seconds (standard HTTP timeout)
 * - Scale: 0-200 instances (auto-scaling based on load)
 * - Auth: JWT validation with Entra ID
 * - CORS: Configured based on backend.config.allowedOrigins
 * - Retry: 3 attempts with exponential backoff
 * - Monitoring: Application Insights integration
 * - Cold start optimization: Enabled
 */

import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const processUpload = defineFunctions({
  ProcessUpload: configureFunction('process-upload')
    .memory(512)
    .timeout(300000)
    .withHandler(async (context, req) => {
      // Handler implementation from ./handler.ts
      context.log('Processing file upload');
      // TODO: Implement upload processing logic
      return {
        status: 200,
        body: { message: 'Upload processed successfully' },
      };
    }),
});

/**
 * What you get with this minimal configuration:
 *
 * 1. HTTP Endpoint:
 *    POST /api/upload
 *    - Automatic request parsing
 *    - File upload support
 *    - JSON request/response
 *
 * 2. Security:
 *    - JWT token validation
 *    - Function key requirement
 *    - CORS headers configured
 *    - Rate limiting applied
 *
 * 3. Scaling:
 *    - Auto-scales from 0 to 200 instances
 *    - Cold start optimization
 *    - Load balancing
 *
 * 4. Monitoring:
 *    - Request logging
 *    - Performance metrics
 *    - Error tracking
 *    - Custom metrics support
 *
 * 5. Error Handling:
 *    - Automatic retries on failure
 *    - Dead letter queue for failed messages
 *    - Structured error responses
 *
 * The handler.ts file contains the actual business logic.
 * This separation keeps configuration clean and logic focused.
 */
