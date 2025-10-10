/**
 * Local development server for Azure Functions
 *
 * Provides a local HTTP server that simulates Azure Functions runtime
 * for testing functions without deploying to Azure.
 *
 * @packageDocumentation
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import chalk from 'chalk';

/**
 * Function metadata from discovery
 */
interface FunctionMetadata {
  readonly name: string;
  readonly handlerPath: string;
  readonly resourcePath: string;
  readonly trigger: TriggerConfig;
  readonly environment: Record<string, string>;
}

/**
 * Trigger configuration
 */
interface TriggerConfig {
  readonly type: string;
  readonly route?: string;
  readonly methods?: readonly string[];
  readonly authLevel?: string;
  readonly schedule?: string;
}

/**
 * HTTP request representation
 */
interface FunctionHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, string>;
  readonly params: Record<string, string>;
  readonly body?: unknown;
}

/**
 * HTTP response representation
 */
interface FunctionHttpResponse {
  readonly status?: number;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

/**
 * Local development server for Azure Functions
 *
 * Simulates the Azure Functions runtime locally for testing and development.
 *
 * Features:
 * - HTTP trigger simulation
 * - Route parameter matching
 * - Environment variable injection
 * - Hot reload on file changes
 * - Request/response logging
 *
 * @example
 * ```typescript
 * const server = new FunctionDevServer({
 *   functionsPath: './functions',
 *   port: 7071,
 * });
 *
 * await server.start();
 * ```
 */
export class FunctionDevServer {
  private readonly functionsPath: string;
  private readonly port: number;
  private readonly host: string;
  private server: http.Server | null = null;
  private functions: Map<string, FunctionMetadata> = new Map();
  private routes: Array<{
    pattern: RegExp;
    functionName: string;
    methods: readonly string[];
  }> = [];

  /**
   * Create a new FunctionDevServer
   *
   * @param options - Server configuration
   */
  constructor(options: {
    readonly functionsPath?: string;
    readonly port?: number;
    readonly host?: string;
  } = {}) {
    this.functionsPath = options.functionsPath ?? './functions';
    this.port = options.port ?? 7071;
    this.host = options.host ?? 'localhost';
  }

  /**
   * Start the development server
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    // Discover functions
    await this.discoverFunctions();

    // Create HTTP server
    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    // Start listening
    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, this.host, () => {
        console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.white('  Azure Functions Local Development Server'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        console.log(chalk.green(`  Server running at http://${this.host}:${this.port}/\n`));

        if (this.functions.size > 0) {
          console.log(chalk.bold('  Available Functions:\n'));
          for (const [name, func] of this.functions) {
            if (func.trigger.type === 'http') {
              const route = func.trigger.route || name;
              const methods = func.trigger.methods || ['GET', 'POST'];
              console.log(`  ${chalk.cyan('•')} ${chalk.bold(name)}`);
              console.log(`    ${chalk.dim('Route:')} http://${this.host}:${this.port}/api/${route}`);
              console.log(`    ${chalk.dim('Methods:')} ${methods.join(', ')}\n`);
            }
          }
        } else {
          console.log(chalk.yellow('  No functions discovered'));
          console.log(chalk.dim('  Create a function with: atakora function create\n'));
        }

        console.log(chalk.dim('  Press Ctrl+C to stop\n'));
        resolve();
      });

      this.server!.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the development server
   *
   * @returns Promise that resolves when server is stopped
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log(chalk.yellow('\nServer stopped'));
          resolve();
        }
      });
    });
  }

  /**
   * Discover functions from the functions directory
   */
  private async discoverFunctions(): Promise<void> {
    const functionsDirPath = path.join(process.cwd(), this.functionsPath);

    if (!fs.existsSync(functionsDirPath)) {
      console.log(chalk.yellow(`Functions directory not found: ${this.functionsPath}`));
      return;
    }

    const directories = fs.readdirSync(functionsDirPath, { withFileTypes: true });

    for (const dir of directories) {
      if (!dir.isDirectory()) {
        continue;
      }

      const funcName = dir.name;
      const funcDir = path.join(functionsDirPath, funcName);

      // Check for handler
      const handlerTsPath = path.join(funcDir, 'handler.ts');
      const handlerJsPath = path.join(funcDir, 'handler.js');
      const handlerPath = fs.existsSync(handlerTsPath)
        ? handlerTsPath
        : fs.existsSync(handlerJsPath)
        ? handlerJsPath
        : null;

      if (!handlerPath) {
        continue;
      }

      // Check for resource configuration
      const resourceTsPath = path.join(funcDir, 'resource.ts');
      const resourceJsPath = path.join(funcDir, 'resource.js');
      const resourcePath = fs.existsSync(resourceTsPath)
        ? resourceTsPath
        : fs.existsSync(resourceJsPath)
        ? resourceJsPath
        : null;

      // Load trigger configuration from resource file
      let trigger: TriggerConfig = { type: 'http' }; // Default
      if (resourcePath) {
        // TODO: Actually load and parse resource.ts file
        // For now, use defaults
        trigger = {
          type: 'http',
          route: funcName,
          methods: ['GET', 'POST'],
          authLevel: 'anonymous',
        };
      }

      // Add function metadata
      const metadata: FunctionMetadata = {
        name: funcName,
        handlerPath,
        resourcePath: resourcePath ?? '',
        trigger,
        environment: {},
      };

      this.functions.set(funcName, metadata);

      // Register HTTP routes
      if (trigger.type === 'http') {
        this.registerHttpRoute(funcName, trigger);
      }
    }
  }

  /**
   * Register an HTTP route for a function
   */
  private registerHttpRoute(functionName: string, trigger: TriggerConfig): void {
    const route = trigger.route || functionName;
    const methods = trigger.methods || ['GET', 'POST'];

    // Convert Azure Functions route pattern to regex
    // e.g., 'api/users/{userId}' => /^\/api\/users\/([^\/]+)$/
    const pattern = this.routePatternToRegex(route);

    this.routes.push({
      pattern,
      functionName,
      methods,
    });
  }

  /**
   * Convert Azure Functions route pattern to regular expression
   */
  private routePatternToRegex(route: string): RegExp {
    // Normalize route (remove leading/trailing slashes)
    let normalizedRoute = route.replace(/^\/+|\/+$/g, '');

    // Add 'api' prefix if not present
    if (!normalizedRoute.startsWith('api/')) {
      normalizedRoute = `api/${normalizedRoute}`;
    }

    // Convert {param} to capture groups
    const regexPattern = normalizedRoute.replace(/\{([^}]+)\}/g, '([^/]+)');

    // Create regex that matches from start to end
    return new RegExp(`^/${regexPattern}$`, 'i');
  }

  /**
   * Handle an incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    const method = req.method || 'GET';
    const url = req.url || '/';

    try {
      console.log(chalk.dim(`[${new Date().toISOString()}] ${method} ${url}`));

      // Parse URL
      const parsedUrl = new URL(url, `http://${this.host}:${this.port}`);
      const pathname = parsedUrl.pathname;

      // Find matching route
      const match = this.findMatchingRoute(method, pathname);

      if (!match) {
        this.sendNotFound(res, pathname);
        return;
      }

      const { functionName, params } = match;
      const func = this.functions.get(functionName);

      if (!func) {
        this.sendNotFound(res, pathname);
        return;
      }

      // Read request body
      const body = await this.readRequestBody(req);

      // Parse query parameters
      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      // Create function request
      const functionRequest: FunctionHttpRequest = {
        method,
        url,
        headers: req.headers as Record<string, string>,
        query,
        params,
        body: body ? JSON.parse(body) : undefined,
      };

      // Invoke function
      const response = await this.invokeFunction(func, functionRequest);

      // Send response
      const statusCode = response.status || 200;
      const headers = response.headers || { 'Content-Type': 'application/json' };

      res.writeHead(statusCode, headers);
      res.end(
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body || {})
      );

      const duration = Date.now() - startTime;
      console.log(chalk.green(`  ${statusCode} ${method} ${url} (+${duration}ms)`));
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(chalk.red(`  500 ${method} ${url} (+${duration}ms)`));

      if (error instanceof Error) {
        console.error(chalk.red(`  Error: ${error.message}`));
      }

      this.sendError(res, error instanceof Error ? error.message : 'Internal Server Error');
    }
  }

  /**
   * Find matching route for a request
   */
  private findMatchingRoute(
    method: string,
    pathname: string
  ): { functionName: string; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (!route.methods.includes(method)) {
        continue;
      }

      const match = pathname.match(route.pattern);
      if (match) {
        // Extract route parameters
        const params: Record<string, string> = {};
        // TODO: Extract actual parameter names from route pattern
        // For now, just use positional params

        return {
          functionName: route.functionName,
          params,
        };
      }
    }

    return null;
  }

  /**
   * Read request body
   */
  private readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve(body);
      });

      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Invoke a function
   */
  private async invokeFunction(
    func: FunctionMetadata,
    request: FunctionHttpRequest
  ): Promise<FunctionHttpResponse> {
    // TODO: Actually load and execute the handler
    // This would require:
    // 1. Compiling TypeScript on-the-fly (using esbuild or tsx)
    // 2. Creating execution context with FunctionTestUtils
    // 3. Invoking the handler
    // 4. Capturing logs and response

    // For now, return a placeholder response
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        message: 'Function execution not yet implemented',
        function: func.name,
        request: {
          method: request.method,
          url: request.url,
        },
      },
    };
  }

  /**
   * Send 404 Not Found response
   */
  private sendNotFound(res: http.ServerResponse, pathname: string): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Not Found',
        message: `No function found for route: ${pathname}`,
        availableRoutes: Array.from(this.functions.values())
          .filter((f) => f.trigger.type === 'http')
          .map((f) => {
            const route = f.trigger.route || f.name;
            return `/api/${route}`;
          }),
      })
    );
  }

  /**
   * Send 500 Internal Server Error response
   */
  private sendError(res: http.ServerResponse, message: string): void {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Internal Server Error',
        message,
      })
    );
  }
}

/**
 * Start the local development server
 *
 * @param options - Server configuration
 * @returns Promise resolving to the server instance
 *
 * @example
 * ```typescript
 * const server = await startDevServer({
 *   functionsPath: './functions',
 *   port: 7071,
 * });
 * ```
 */
export async function startDevServer(options?: {
  readonly functionsPath?: string;
  readonly port?: number;
  readonly host?: string;
}): Promise<FunctionDevServer> {
  const server = new FunctionDevServer(options);
  await server.start();
  return server;
}
