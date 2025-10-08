import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmApiManagementProductProps,
  ApiManagementProductProps,
  IApiManagement,
  IApiManagementProduct,
} from './types';
import { ProductState } from './types';

/**
 * L1 construct for API Management Product.
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service/products ARM resource.
 * This is a child resource of API Management service.
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service/products`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 *
 * @example
 * ```typescript
 * const product = new ArmApiManagementProduct(apimService, 'AuthRProduct', {
 *   apiManagementService: apimService,
 *   productName: 'authr-product',
 *   properties: {
 *     displayName: 'AuthR Product',
 *     subscriptionRequired: true,
 *     approvalRequired: false,
 *     state: ProductState.PUBLISHED
 *   }
 * });
 * ```
 */
export class ArmApiManagementProduct extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ApiManagement/service/products';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-05-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent API Management service.
   */
  public readonly apiManagementService: IApiManagement;

  /**
   * Product name.
   */
  public readonly productName: string;

  /**
   * Resource name (same as productName).
   */
  public readonly name: string;

  /**
   * Display name.
   */
  public readonly displayName: string;

  /**
   * Description.
   */
  public readonly description?: string;

  /**
   * Subscription required.
   */
  public readonly subscriptionRequired?: boolean;

  /**
   * Approval required.
   */
  public readonly approvalRequired?: boolean;

  /**
   * Subscriptions limit.
   */
  public readonly subscriptionsLimit?: number;

  /**
   * Product state.
   */
  public readonly state?: ProductState;

  /**
   * Terms of use.
   */
  public readonly terms?: string;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Product ID (alias for resourceId).
   */
  public readonly productId: string;

  constructor(scope: Construct, id: string, props: ArmApiManagementProductProps) {
    super(scope, id);

    this.validateProps(props);

    this.apiManagementService = props.apiManagementService;
    this.productName = props.productName;
    this.name = props.productName;
    this.displayName = props.properties.displayName;
    this.description = props.properties.description;
    this.subscriptionRequired = props.properties.subscriptionRequired;
    this.approvalRequired = props.properties.approvalRequired;
    this.subscriptionsLimit = props.properties.subscriptionsLimit;
    this.state = props.properties.state;
    this.terms = props.properties.terms;

    this.resourceId = `${this.apiManagementService.apiManagementId}/products/${this.productName}`;
    this.productId = this.resourceId;
  }

  private validateProps(props: ArmApiManagementProductProps): void {
    if (!props.productName || props.productName.trim() === '') {
      throw new Error('Product name cannot be empty');
    }

    if (!props.properties.displayName || props.properties.displayName.trim() === '') {
      throw new Error('Display name cannot be empty');
    }
  }

  public toArmTemplate(): object {
    const properties: any = {
      displayName: this.displayName,
    };

    if (this.description) {
      properties.description = this.description;
    }

    if (this.subscriptionRequired !== undefined) {
      properties.subscriptionRequired = this.subscriptionRequired;
    }

    if (this.approvalRequired !== undefined) {
      properties.approvalRequired = this.approvalRequired;
    }

    if (this.subscriptionsLimit !== undefined) {
      properties.subscriptionsLimit = this.subscriptionsLimit;
    }

    if (this.state) {
      properties.state = this.state;
    }

    if (this.terms) {
      properties.terms = this.terms;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.apiManagementService.serviceName}/${this.productName}`,
      properties,
      dependsOn: [this.apiManagementService.apiManagementId],
    };
  }
}

/**
 * L2 construct for API Management Product.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 *
 * @example
 * ```typescript
 * const product = new ApiManagementProduct(apimService, 'AuthRProduct', {
 *   apiManagementService: apimService,
 *   displayName: 'AuthR Product',
 *   description: 'Product for AuthR API access'
 * });
 * ```
 */
export class ApiManagementProduct extends Construct implements IApiManagementProduct {
  private readonly armProduct: ArmApiManagementProduct;

  public readonly productName: string;
  public readonly productId: string;

  constructor(scope: Construct, id: string, props: ApiManagementProductProps) {
    super(scope, id);

    this.productName = props.productName ?? this.sanitizeProductName(id);

    this.armProduct = new ArmApiManagementProduct(scope, `${id}-Resource`, {
      apiManagementService: props.apiManagementService,
      productName: this.productName,
      properties: {
        displayName: props.displayName,
        description: props.description,
        subscriptionRequired: props.subscriptionRequired ?? true,
        approvalRequired: props.approvalRequired ?? false,
        subscriptionsLimit: props.subscriptionsLimit,
        state: props.state ?? ('published' as ProductState),
        terms: props.terms,
      },
    });

    this.productId = this.armProduct.productId;
  }

  private sanitizeProductName(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}
