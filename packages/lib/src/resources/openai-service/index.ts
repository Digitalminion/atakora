/**
 * Azure OpenAI Service constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure OpenAI Services.
 *
 * **Resource Type**: Microsoft.CognitiveServices/accounts
 * **API Version**: 2023-05-01
 * **Kind**: OpenAI
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmOpenAIService, CognitiveServicesSku } from '@azure-arm-priv/lib';
 *
 * const openai = new ArmOpenAIService(resourceGroup, 'OpenAI', {
 *   accountName: 'oai-colorai-001',
 *   location: 'eastus',
 *   sku: {
 *     name: 'S0'
 *   },
 *   properties: {
 *     customSubDomainName: 'oai-colorai-001'
 *   }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { OpenAIService } from '@azure-arm-priv/lib';
 *
 * const openai = new OpenAIService(resourceGroup, 'GPT');
 * // Auto-generates name, sets custom subdomain, uses secure defaults
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmOpenAIService } from './arm-openai-service';

// L2 construct (intent-based)
export { OpenAIService } from './openai-service';

// Type definitions
export type {
  ArmOpenAIServiceProps,
  OpenAIServiceProps,
  IOpenAIService,
  CognitiveServicesSku as OpenAISku,
  NetworkRuleSet as OpenAINetworkRuleSet,
  IpRule as OpenAIIpRule,
  VirtualNetworkRule as OpenAIVirtualNetworkRule,
} from './types';

// Enums
export {
  CognitiveServicesSkuName as CognitiveServicesSku,
  PublicNetworkAccess as OpenAIPublicNetworkAccess,
  NetworkRuleAction as OpenAINetworkRuleAction,
} from './types';
