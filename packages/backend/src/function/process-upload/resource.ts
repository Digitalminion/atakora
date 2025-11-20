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

import { defineFunction } from '@atakora/component/functions';

export const processUpload = defineFunction({
  name: 'process-upload',

  // Points to the handler file in the same directory
  entry: './handler.ts',

  // HTTP trigger - the most common function type
  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'upload',
    // authLevel defaults to 'function' (requires function key)
    // Can be 'anonymous' or 'admin' if needed
  },

  // Only override defaults when needed:
  timeout: 300, // 5 minutes for file processing
  memory: 512,  // More memory for file handling

  // Everything else uses smart defaults!
  // No need to specify unless you need different values
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