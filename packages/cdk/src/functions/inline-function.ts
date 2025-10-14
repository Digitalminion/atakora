import { Construct } from '@atakora/cdk';
import type { IFunctionApp } from './function-app-types';

/**
 * Properties for an inline function
 */
export interface InlineFunctionProps {
  /**
   * Function name
   */
  readonly functionName: string;

  /**
   * JavaScript code for the function
   */
  readonly code: string;

  /**
   * HTTP trigger configuration (required for now, can be extended for other triggers)
   */
  readonly httpTrigger?: {
    /**
     * HTTP methods (default: ['GET', 'POST'])
     */
    readonly methods?: string[];

    /**
     * Auth level (default: 'function')
     */
    readonly authLevel?: 'anonymous' | 'function' | 'admin';

    /**
     * Route template
     */
    readonly route?: string;
  };
}

/**
 * Inline Function construct for Azure Functions with code provided as a string
 *
 * @remarks
 * This construct is designed for functions where the code is generated programmatically
 * (e.g., CRUD functions generated from schemas) rather than loaded from files.
 *
 * **ARM Resource Type**: `Microsoft.Web/sites/functions`
 * **API Version**: `2023-01-01`
 *
 * @example
 * ```typescript
 * const func = new InlineFunction(functionApp, 'CreateUser', {
 *   functionName: 'create-user',
 *   code: generatedCode,
 *   httpTrigger: {
 *     methods: ['POST'],
 *     authLevel: 'function'
 *   }
 * });
 * ```
 */
export class InlineFunction extends Construct {
  /**
   * Function name
   */
  public readonly functionName: string;

  /**
   * JavaScript code
   */
  public readonly code: string;

  /**
   * HTTP trigger configuration
   */
  public readonly httpTrigger?: InlineFunctionProps['httpTrigger'];

  /**
   * Parent Function App name
   */
  private readonly functionAppName: string;

  constructor(scope: Construct, id: string, props: InlineFunctionProps) {
    super(scope, id);

    // Get parent Function App
    const functionApp = this.getParentFunctionApp(scope);
    this.functionAppName = functionApp.functionAppName;

    this.functionName = props.functionName;
    this.code = props.code;
    this.httpTrigger = props.httpTrigger;
  }

  /**
   * Gets the parent FunctionApp from the construct tree.
   *
   * @param scope - Parent construct
   * @returns Function App interface
   * @throws {Error} If parent is not a FunctionApp
   */
  private getParentFunctionApp(scope: Construct): IFunctionApp {
    // Walk up the construct tree to find FunctionApp
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IFunctionApp interface using duck typing
      if (this.isFunctionApp(current)) {
        return current as IFunctionApp;
      }
      current = current.node.scope;
    }

    throw new Error(
      'InlineFunction must be created within or under a FunctionApp. ' +
        'Ensure the parent scope is a FunctionApp or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IFunctionApp interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has FunctionApp properties
   */
  private isFunctionApp(construct: any): construct is IFunctionApp {
    return (
      construct &&
      typeof construct.functionAppName === 'string' &&
      typeof construct.functionAppId === 'string'
    );
  }

  /**
   * Transforms this resource to ARM template JSON representation.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): any {
    // Build bindings for HTTP trigger
    const bindings: any[] = [];

    if (this.httpTrigger) {
      bindings.push({
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        authLevel: this.httpTrigger.authLevel || 'function',
        methods: this.httpTrigger.methods || ['get', 'post'],
        ...(this.httpTrigger.route && { route: this.httpTrigger.route }),
      });

      bindings.push({
        type: 'http',
        direction: 'out',
        name: 'res',
      });
    }

    return {
      type: 'Microsoft.Web/sites/functions',
      apiVersion: '2023-01-01',
      name: `${this.functionAppName}/${this.functionName}`,
      properties: {
        config: {
          bindings,
        },
        files: {
          // The code will be automatically JSON-stringified during serialization
          'index.js': this.code,
        },
      },
      dependsOn: [
        `[resourceId('Microsoft.Web/sites', '${this.functionAppName}')]`,
      ],
    };
  }
}
