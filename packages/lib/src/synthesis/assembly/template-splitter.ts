/**
 * Template Splitter - Intelligently splits large ARM templates into linked templates
 *
 * @remarks
 * This component addresses Azure's 4MB ARM template size limit by splitting templates
 * across multiple linked templates. It uses intelligent grouping based on:
 * - Resource type categories (Foundation, Compute, Application, Configuration)
 * - Dependency relationships (preserves deployment order)
 * - Affinity rules (keeps related resources together)
 * - Size constraints (each template < 3.5MB)
 *
 * Version 2.0: Refactored to work with ResourceMetadata for context-aware synthesis.
 * The new assignResources() method operates on lightweight metadata before ARM generation,
 * enabling better optimization and cross-template dependency tracking.
 *
 * @see docs/design/architecture/template-splitting-strategy.md
 * @see docs/design/architecture/adr-018-synthesis-pipeline-refactoring.md
 */

import {
  ArmTemplate,
  ArmResource,
  ResourceMetadata,
  TemplateAssignments,
  TemplateAssignmentOptions,
  TemplateMetadata,
  CrossTemplateDependency,
  ResourcePlacement,
} from '../types';

/**
 * Resource tier categories for grouping
 */
export enum ResourceTier {
  FOUNDATION = 'foundation',
  COMPUTE = 'compute',
  APPLICATION = 'application',
  CONFIGURATION = 'configuration',
}

/**
 * Resource dependency graph
 */
export interface DependencyGraph {
  nodes: Map<string, ArmResource>;
  edges: Map<string, Set<string>>;
}

/**
 * Resource group with affinity
 */
export interface ResourceGroup {
  tier: ResourceTier;
  resources: ArmResource[];
  size: number;
  name: string;
}

/**
 * Linked template set result
 */
export interface LinkedTemplateSet {
  /**
   * Root template that references linked templates
   */
  root: ArmTemplate;

  /**
   * Linked templates by name
   */
  linked: Map<string, ArmTemplate>;

  /**
   * Dependencies between templates (for deployment order)
   */
  dependencies: Map<string, string[]>;

  /**
   * Deployment order (topologically sorted)
   */
  deploymentOrder: string[];
}

/**
 * Template Splitter options
 */
export interface TemplateSplitterOptions {
  /**
   * Maximum template size in bytes (default: 3.5MB)
   */
  maxTemplateSize?: number;

  /**
   * Maximum resources per template (default: 200)
   */
  maxResourcesPerTemplate?: number;

  /**
   * Stack name for template naming
   */
  stackName: string;
}

/**
 * Template Splitter - splits large ARM templates into linked templates
 */
export class TemplateSplitter {
  private readonly maxTemplateSize: number;
  private readonly maxResourcesPerTemplate: number;
  private readonly stackName: string;

  // Resource type to tier mapping
  private readonly tierMapping: Map<string, ResourceTier> = new Map([
    // Foundation tier
    ['Microsoft.Storage/storageAccounts', ResourceTier.FOUNDATION],
    ['Microsoft.DocumentDB/databaseAccounts', ResourceTier.FOUNDATION],
    ['Microsoft.Sql/servers', ResourceTier.FOUNDATION],
    ['Microsoft.Network/virtualNetworks', ResourceTier.FOUNDATION],
    ['Microsoft.Network/networkSecurityGroups', ResourceTier.FOUNDATION],
    ['Microsoft.KeyVault/vaults', ResourceTier.FOUNDATION],
    ['Microsoft.OperationalInsights/workspaces', ResourceTier.FOUNDATION],

    // Compute tier
    ['Microsoft.Web/serverfarms', ResourceTier.COMPUTE],
    ['Microsoft.Web/sites', ResourceTier.COMPUTE],
    ['Microsoft.ContainerInstance/containerGroups', ResourceTier.COMPUTE],
    ['Microsoft.Compute/virtualMachines', ResourceTier.COMPUTE],
    ['Microsoft.ContainerService/managedClusters', ResourceTier.COMPUTE],

    // Application tier
    ['Microsoft.Web/sites/functions', ResourceTier.APPLICATION],
    ['Microsoft.ApiManagement/service', ResourceTier.APPLICATION],
    ['Microsoft.Insights/components', ResourceTier.APPLICATION],
    ['Microsoft.Cdn/profiles', ResourceTier.APPLICATION],

    // Configuration tier
    ['Microsoft.Authorization/roleAssignments', ResourceTier.CONFIGURATION],
    ['Microsoft.Insights/diagnosticSettings', ResourceTier.CONFIGURATION],
    ['Microsoft.Insights/metricAlerts', ResourceTier.CONFIGURATION],
    ['Microsoft.Insights/autoscalesettings', ResourceTier.CONFIGURATION],
  ]);

  // Strong affinity rules - resources that MUST stay together
  private readonly strongAffinity: Array<[string, string]> = [
    ['Microsoft.Web/sites', 'Microsoft.Web/sites/functions'],
    ['Microsoft.Web/sites', 'Microsoft.Web/sites/config'],
    ['Microsoft.DocumentDB/databaseAccounts', 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases'],
    ['Microsoft.Storage/storageAccounts', 'Microsoft.Storage/storageAccounts/blobServices'],
    ['Microsoft.Network/virtualNetworks', 'Microsoft.Network/virtualNetworks/subnets'],
    ['Microsoft.Compute/virtualMachines', 'Microsoft.Compute/virtualMachines/extensions'],
  ];

  constructor(options: TemplateSplitterOptions) {
    this.maxTemplateSize = options.maxTemplateSize ?? 3.5 * 1024 * 1024; // 3.5MB default
    this.maxResourcesPerTemplate = options.maxResourcesPerTemplate ?? 200;
    this.stackName = options.stackName;
  }

  // ============================================================================
  // V2 API: Metadata-Based Template Assignment
  // ============================================================================

  /**
   * Assign resources to templates based on metadata (V2 API)
   *
   * This is the new API that works with ResourceMetadata before ARM generation.
   * It implements Phase 2 of the context-aware synthesis pipeline.
   *
   * @param metadata - Array of resource metadata from Phase 1
   * @param options - Template assignment options
   * @returns Template assignments with cross-template dependencies
   *
   * @remarks
   * Algorithm:
   * 1. Group resources by strategy (minimize-cross-refs, resource-type, or dependency-chain)
   * 2. Enforce co-location constraints (requiresSameTemplate)
   * 3. Split groups that exceed size limits
   * 4. Assign resources to templates
   * 5. Identify cross-template dependencies
   * 6. Calculate template metadata and deployment order
   *
   * @example
   * ```typescript
   * const splitter = new TemplateSplitter({ stackName: 'Foundation' });
   * const assignments = splitter.assignResources(metadata, {
   *   maxTemplateSize: 3 * 1024 * 1024,
   *   groupingStrategy: 'minimize-cross-refs'
   * });
   * ```
   */
  assignResources(metadata: ResourceMetadata[], options?: TemplateAssignmentOptions): TemplateAssignments {
    const opts: Required<TemplateAssignmentOptions> = {
      maxTemplateSize: options?.maxTemplateSize ?? this.maxTemplateSize,
      groupingStrategy: options?.groupingStrategy ?? 'minimize-cross-refs',
      preferLinkedTemplates: options?.preferLinkedTemplates ?? false,
      customGrouping: options?.customGrouping ?? undefined,
    };

    // Step 1: Check if splitting is needed
    const totalSize = metadata.reduce((sum, r) => sum + r.sizeEstimate, 0);
    if (
      !opts.preferLinkedTemplates &&
      totalSize < opts.maxTemplateSize &&
      metadata.length < this.maxResourcesPerTemplate
    ) {
      // Single template - no splitting needed
      return this.createSingleTemplateAssignment(metadata);
    }

    // Step 2: Apply custom grouping if provided
    if (opts.customGrouping) {
      const groups = opts.customGrouping(metadata);
      return this.createAssignmentsFromGroups(metadata, groups, opts);
    }

    // Step 3: Group resources by strategy
    const groups = this.groupByStrategy(metadata, opts.groupingStrategy);

    // Step 4: Enforce co-location constraints
    this.enforceCoLocation(groups, metadata);

    // Step 5: Split groups that exceed size limits
    const finalGroups = this.splitGroupsBySize(groups, metadata, opts.maxTemplateSize);

    // Step 6: Create template assignments
    return this.createAssignmentsFromGroups(metadata, finalGroups, opts);
  }

  /**
   * Group resources by the specified strategy
   *
   * @param metadata - Array of resource metadata
   * @param strategy - Grouping strategy to apply
   * @returns Map of template name to array of resource IDs
   */
  private groupByStrategy(metadata: ResourceMetadata[], strategy: string): Map<string, string[]> {
    switch (strategy) {
      case 'minimize-cross-refs':
        return this.groupByMinimizeCrossRefs(metadata);
      case 'resource-type':
        return this.groupByResourceType(metadata);
      case 'dependency-chain':
        return this.groupByDependencyChain(metadata);
      default:
        throw new Error(`Unknown grouping strategy: ${strategy}`);
    }
  }

  /**
   * Strategy: Minimize cross-template references
   *
   * Groups resources to minimize the number of cross-template dependencies.
   * Uses tier-based grouping and dependency analysis.
   *
   * @param metadata - Array of resource metadata
   * @returns Map of template name to array of resource IDs
   */
  private groupByMinimizeCrossRefs(metadata: ResourceMetadata[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    // Group by tier first (foundation, compute, application, configuration)
    const tierGroups = new Map<string, ResourceMetadata[]>();

    for (const resource of metadata) {
      const tier = resource.templatePreference || this.inferTierFromType(resource.type);
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(resource);
    }

    // Create template names for each tier
    let tierIndex = 0;
    for (const [tier, resources] of tierGroups) {
      if (resources.length === 0) continue;

      const templateName = `${this.stackName}-${tier}`;
      groups.set(templateName, resources.map((r) => r.id));
      tierIndex++;
    }

    // If all resources fit in one tier, don't create separate templates
    if (groups.size === 1) {
      const mainTemplateName = `${this.stackName}.json`;
      const allIds = Array.from(groups.values())[0];
      groups.clear();
      groups.set(mainTemplateName, allIds);
    }

    return groups;
  }

  /**
   * Strategy: Group by resource type
   *
   * Groups resources by their ARM resource type (e.g., all Microsoft.Storage together).
   *
   * @param metadata - Array of resource metadata
   * @returns Map of template name to array of resource IDs
   */
  private groupByResourceType(metadata: ResourceMetadata[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    // Group by base resource provider (e.g., "Microsoft.Storage", "Microsoft.Web")
    const providerGroups = new Map<string, ResourceMetadata[]>();

    for (const resource of metadata) {
      const provider = resource.type.split('/')[0]; // e.g., "Microsoft.Storage"
      if (!providerGroups.has(provider)) {
        providerGroups.set(provider, []);
      }
      providerGroups.get(provider)!.push(resource);
    }

    // Create template names for each provider
    for (const [provider, resources] of providerGroups) {
      const providerName = provider.replace('Microsoft.', '').toLowerCase();
      const templateName = `${this.stackName}-${providerName}`;
      groups.set(templateName, resources.map((r) => r.id));
    }

    return groups;
  }

  /**
   * Strategy: Group by dependency chain
   *
   * Groups resources that form dependency chains together.
   * Keeps strongly connected components in the same template.
   *
   * @param metadata - Array of resource metadata
   * @returns Map of template name to array of resource IDs
   */
  private groupByDependencyChain(metadata: ResourceMetadata[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const visited = new Set<string>();

    // Build adjacency list for dependency graph
    const adjacencyList = new Map<string, string[]>();
    for (const resource of metadata) {
      adjacencyList.set(resource.id, [...resource.dependencies]);
    }

    // Find connected components using DFS
    let chainIndex = 0;
    for (const resource of metadata) {
      if (visited.has(resource.id)) continue;

      const chain: string[] = [];
      const stack = [resource.id];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;

        visited.add(current);
        chain.push(current);

        // Add dependencies to stack
        const deps = adjacencyList.get(current) || [];
        for (const dep of deps) {
          if (!visited.has(dep)) {
            stack.push(dep);
          }
        }

        // Also add dependents (resources that depend on this one)
        for (const [id, depList] of adjacencyList) {
          if (depList.includes(current) && !visited.has(id)) {
            stack.push(id);
          }
        }
      }

      if (chain.length > 0) {
        const templateName = `${this.stackName}-chain-${chainIndex++}`;
        groups.set(templateName, chain);
      }
    }

    return groups;
  }

  /**
   * Enforce co-location constraints
   *
   * Ensures resources that must be in the same template are grouped together.
   *
   * @param groups - Current grouping map (modified in place)
   * @param metadata - Array of resource metadata
   */
  private enforceCoLocation(groups: Map<string, string[]>, metadata: ResourceMetadata[]): void {
    // Build reverse lookup: resource ID -> template name
    const resourceToTemplate = new Map<string, string>();
    for (const [templateName, resourceIds] of groups) {
      for (const id of resourceIds) {
        resourceToTemplate.set(id, templateName);
      }
    }

    // Process co-location constraints
    let changed = true;
    while (changed) {
      changed = false;

      for (const resource of metadata) {
        if (!resource.requiresSameTemplate || resource.requiresSameTemplate.length === 0) {
          continue;
        }

        const primaryTemplate = resourceToTemplate.get(resource.id);
        if (!primaryTemplate) continue;

        // Move all co-located resources to the same template
        for (const colocatedId of resource.requiresSameTemplate) {
          const colocatedTemplate = resourceToTemplate.get(colocatedId);

          if (!colocatedTemplate) {
            // Resource not found - it will be added later
            continue;
          }

          if (colocatedTemplate !== primaryTemplate) {
            // Need to merge templates
            const colocatedResources = groups.get(colocatedTemplate) || [];
            const primaryResources = groups.get(primaryTemplate) || [];

            // Move resources from colocated template to primary template
            for (const id of colocatedResources) {
              if (!primaryResources.includes(id)) {
                primaryResources.push(id);
                resourceToTemplate.set(id, primaryTemplate);
              }
            }

            // Update the groups
            groups.set(primaryTemplate, primaryResources);
            groups.delete(colocatedTemplate);

            changed = true;
          }
        }
      }
    }
  }

  /**
   * Split groups that exceed size limits
   *
   * @param groups - Current grouping map
   * @param metadata - Array of resource metadata
   * @param maxSize - Maximum template size in bytes
   * @returns New grouping map with split groups
   */
  private splitGroupsBySize(
    groups: Map<string, string[]>,
    metadata: ResourceMetadata[],
    maxSize: number
  ): Map<string, string[]> {
    const finalGroups = new Map<string, string[]>();
    const metadataMap = new Map(metadata.map((m) => [m.id, m]));

    for (const [templateName, resourceIds] of groups) {
      // Calculate total size of this group
      let totalSize = 0;
      for (const id of resourceIds) {
        const meta = metadataMap.get(id);
        if (meta) {
          totalSize += meta.sizeEstimate;
        }
      }

      // Check if splitting is needed
      if (totalSize <= maxSize) {
        finalGroups.set(templateName, resourceIds);
        continue;
      }

      // Split into multiple templates
      let subgroupIndex = 0;
      let currentGroup: string[] = [];
      let currentSize = 0;

      for (const id of resourceIds) {
        const meta = metadataMap.get(id);
        const resourceSize = meta?.sizeEstimate ?? 1000;

        // Check if adding this resource would exceed limit
        if (currentSize + resourceSize > maxSize && currentGroup.length > 0) {
          // Save current subgroup and start new one
          const subgroupName = `${templateName}-${subgroupIndex++}`;
          finalGroups.set(subgroupName, currentGroup);
          currentGroup = [];
          currentSize = 0;
        }

        currentGroup.push(id);
        currentSize += resourceSize;
      }

      // Add final subgroup
      if (currentGroup.length > 0) {
        const subgroupName = subgroupIndex === 0 ? templateName : `${templateName}-${subgroupIndex}`;
        finalGroups.set(subgroupName, currentGroup);
      }
    }

    return finalGroups;
  }

  /**
   * Create single template assignment (no splitting)
   *
   * @param metadata - Array of resource metadata
   * @returns Template assignments with single template
   */
  private createSingleTemplateAssignment(metadata: ResourceMetadata[]): TemplateAssignments {
    const templateName = `${this.stackName}.json`;
    const assignments = new Map<string, string>();
    const placements = new Map<string, ResourcePlacement>();

    for (const resource of metadata) {
      assignments.set(resource.id, templateName);
      placements.set(resource.id, {
        resourceId: resource.id,
        templateName,
        tier: resource.templatePreference || 'any',
        assignmentReason: 'main-template-only',
      });
    }

    const totalSize = metadata.reduce((sum, r) => sum + r.sizeEstimate, 0);

    const templateMetadata: TemplateMetadata = {
      fileName: templateName,
      estimatedSize: totalSize,
      resourceCount: metadata.length,
      isMain: true,
      resources: metadata.map((r) => r.id),
    };

    return {
      assignments,
      templates: new Map([[templateName, templateMetadata]]),
      crossTemplateDependencies: [],
      placements,
    };
  }

  /**
   * Create template assignments from groups
   *
   * @param metadata - Array of resource metadata
   * @param groups - Map of template name to resource IDs
   * @param options - Template assignment options
   * @returns Complete template assignments
   */
  private createAssignmentsFromGroups(
    metadata: ResourceMetadata[],
    groups: ReadonlyMap<string, readonly string[]>,
    options: Required<TemplateAssignmentOptions>
  ): TemplateAssignments {
    const assignments = new Map<string, string>();
    const templates = new Map<string, TemplateMetadata>();
    const placements = new Map<string, ResourcePlacement>();
    const metadataMap = new Map(metadata.map((m) => [m.id, m]));

    // Create assignments and template metadata
    for (const [templateName, resourceIds] of groups) {
      let templateSize = 0;
      const resources: string[] = [];

      for (const id of resourceIds) {
        assignments.set(id, templateName);
        resources.push(id);

        const meta = metadataMap.get(id);
        if (meta) {
          templateSize += meta.sizeEstimate;

          placements.set(id, {
            resourceId: id,
            templateName,
            tier: meta.templatePreference || 'any',
            assignmentReason: this.getAssignmentReason(meta, templateName),
          });
        }
      }

      templates.set(templateName, {
        fileName: templateName,
        estimatedSize: templateSize,
        resourceCount: resources.length,
        isMain: groups.size === 1, // Main template if only one template
        resources,
      });
    }

    // Identify cross-template dependencies
    const crossTemplateDeps = this.identifyCrossTemplateDependencies(metadata, assignments);

    return {
      assignments,
      templates,
      crossTemplateDependencies: crossTemplateDeps,
      placements,
    };
  }

  /**
   * Identify cross-template dependencies
   *
   * @param metadata - Array of resource metadata
   * @param assignments - Map of resource IDs to template names
   * @returns Array of cross-template dependencies
   */
  private identifyCrossTemplateDependencies(
    metadata: ResourceMetadata[],
    assignments: ReadonlyMap<string, string>
  ): CrossTemplateDependency[] {
    const dependencies: CrossTemplateDependency[] = [];

    for (const resource of metadata) {
      const sourceTemplate = assignments.get(resource.id);
      if (!sourceTemplate) continue;

      for (const depId of resource.dependencies) {
        const targetTemplate = assignments.get(depId);

        if (targetTemplate && targetTemplate !== sourceTemplate) {
          // Cross-template dependency found
          dependencies.push({
            sourceTemplate,
            targetTemplate,
            sourceResource: resource.id,
            targetResource: depId,
            dependencyType: 'reference',
            outputName: this.generateOutputName(depId),
            expression: 'id',
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Generate output name for cross-template reference
   *
   * @param resourceId - Resource ID
   * @returns Output name
   */
  private generateOutputName(resourceId: string): string {
    // Generate a safe output name from resource ID
    // Example: "Microsoft.Storage/storageAccounts/myaccount" -> "myaccount_id"
    const parts = resourceId.split('/');
    const name = parts[parts.length - 1];
    return `${name}_id`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Get assignment reason for a resource
   *
   * @param resource - Resource metadata
   * @param templateName - Template name
   * @returns Assignment reason string
   */
  private getAssignmentReason(resource: ResourceMetadata, templateName: string): string {
    if (resource.templatePreference) {
      return `${resource.templatePreference}-tier-assignment`;
    }

    if (templateName.includes('chain')) {
      return 'dependency-chain-grouping';
    }

    if (templateName.includes('-')) {
      const tier = templateName.split('-').pop();
      return `${tier}-based-assignment`;
    }

    return 'default-assignment';
  }

  /**
   * Infer tier from resource type
   *
   * @param resourceType - ARM resource type
   * @returns Inferred tier
   */
  private inferTierFromType(resourceType: string): string {
    // Use existing tier mapping
    const tier = this.getResourceTier(resourceType);
    return tier.toLowerCase();
  }

  // ============================================================================
  // V1 API: ARM Template-Based Splitting (Backwards Compatibility)
  // ============================================================================

  /**
   * Split a large ARM template into linked templates (V1 API - DEPRECATED)
   *
   * @deprecated Use assignResources() with ResourceMetadata instead
   * This method is kept for backwards compatibility during migration.
   *
   * @param template - Original ARM template to split
   * @param stackName - Stack name for template naming
   * @returns Linked template set with root and linked templates
   *
   * @remarks
   * This method implements the splitting algorithm:
   * 1. Check if template needs splitting (size > 3MB)
   * 2. Categorize resources by tier
   * 3. Build dependency graph
   * 4. Apply affinity rules to group related resources
   * 5. Split groups that exceed size limit
   * 6. Generate root template with linked deployments
   * 7. Calculate deployment order
   */
  split(template: ArmTemplate): LinkedTemplateSet {
    const templateSize = this.calculateTemplateSize(template);

    // Check if splitting is needed
    if (templateSize < this.maxTemplateSize && template.resources.length < this.maxResourcesPerTemplate) {
      // No splitting needed - return single template
      return {
        root: template,
        linked: new Map(),
        dependencies: new Map(),
        deploymentOrder: [],
      };
    }

    // Step 1: Categorize resources by tier
    const categorized = this.categorizeResources(template.resources);

    // Step 2: Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(template.resources);

    // Step 3: Apply affinity rules to group related resources
    const groups = this.applyAffinityRules(categorized, dependencyGraph);

    // Step 4: Split groups by size
    const finalGroups = this.splitLargeGroups(groups);

    // Step 5: Generate linked templates
    const linked = this.generateLinkedTemplates(finalGroups, template);

    // Step 6: Calculate cross-template dependencies and deployment order
    const dependencies = this.calculateCrossTemplateDependencies(linked, dependencyGraph);
    const deploymentOrder = this.topologicalSort(Array.from(linked.keys()), dependencies);

    // Step 7: Generate root template with dependencies
    const root = this.generateRootTemplate(linked, template, dependencies);

    return {
      root,
      linked,
      dependencies,
      deploymentOrder,
    };
  }

  /**
   * Categorize resources by tier
   */
  categorizeResources(resources: ArmResource[]): Map<ResourceTier, ArmResource[]> {
    const categorized = new Map<ResourceTier, ArmResource[]>();

    // Initialize all tiers
    for (const tier of Object.values(ResourceTier)) {
      categorized.set(tier as ResourceTier, []);
    }

    // Categorize each resource
    for (const resource of resources) {
      const tier = this.getResourceTier(resource.type);
      const tierResources = categorized.get(tier) || [];
      tierResources.push(resource);
      categorized.set(tier, tierResources);
    }

    return categorized;
  }

  /**
   * Build dependency graph from resources
   */
  buildDependencyGraph(resources: ArmResource[]): DependencyGraph {
    const nodes = new Map<string, ArmResource>();
    const edges = new Map<string, Set<string>>();

    // Build nodes
    for (const resource of resources) {
      const resourceId = this.getResourceId(resource);
      nodes.set(resourceId, resource);
      edges.set(resourceId, new Set());
    }

    // Build edges from dependsOn
    for (const resource of resources) {
      const resourceId = this.getResourceId(resource);
      const dependencies = resource.dependsOn || [];

      for (const dep of dependencies) {
        const depId = this.extractResourceIdFromDependsOn(dep);
        if (nodes.has(depId)) {
          edges.get(resourceId)?.add(depId);
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Apply affinity rules to group related resources
   */
  applyAffinityRules(
    categorized: Map<ResourceTier, ArmResource[]>,
    dependencyGraph: DependencyGraph
  ): ResourceGroup[] {
    const groups: ResourceGroup[] = [];
    let groupIndex = 0;

    // Process each tier
    for (const [tier, resources] of categorized) {
      if (resources.length === 0) continue;

      // Group resources by affinity
      const affinityGroups = this.groupByAffinity(resources, dependencyGraph);

      for (const affinityResources of affinityGroups) {
        const groupSize = this.calculateResourcesSize(affinityResources);
        groups.push({
          tier,
          resources: affinityResources,
          size: groupSize,
          name: `${this.stackName}-${tier}-${groupIndex++}`,
        });
      }
    }

    return groups;
  }

  /**
   * Group resources by affinity (keep related resources together)
   */
  private groupByAffinity(resources: ArmResource[], dependencyGraph: DependencyGraph): ArmResource[][] {
    const groups: ArmResource[][] = [];
    const visited = new Set<string>();

    for (const resource of resources) {
      const resourceId = this.getResourceId(resource);
      if (visited.has(resourceId)) continue;

      // Start a new group with this resource
      const group = [resource];
      visited.add(resourceId);

      // Find all resources with strong affinity to this one
      for (const otherResource of resources) {
        const otherResourceId = this.getResourceId(otherResource);
        if (visited.has(otherResourceId)) continue;

        if (this.hasStrongAffinity(resource, otherResource)) {
          group.push(otherResource);
          visited.add(otherResourceId);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two resources have strong affinity (must stay together)
   */
  private hasStrongAffinity(resource1: ArmResource, resource2: ArmResource): boolean {
    for (const [parentType, childType] of this.strongAffinity) {
      // Check if resource1 is parent and resource2 is child
      if (resource1.type === parentType && resource2.type === childType) {
        // Check if child's name includes parent's name (typical ARM pattern)
        if (resource2.name.includes(resource1.name)) {
          return true;
        }
      }
      // Check reverse
      if (resource2.type === parentType && resource1.type === childType) {
        if (resource1.name.includes(resource2.name)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Split large groups that exceed size limit
   */
  private splitLargeGroups(groups: ResourceGroup[]): ResourceGroup[] {
    const finalGroups: ResourceGroup[] = [];

    for (const group of groups) {
      if (group.size > this.maxTemplateSize || group.resources.length > this.maxResourcesPerTemplate) {
        // Split this group
        const subgroups = this.splitGroup(group);
        finalGroups.push(...subgroups);
      } else {
        finalGroups.push(group);
      }
    }

    return finalGroups;
  }

  /**
   * Split a single group into smaller groups
   */
  private splitGroup(group: ResourceGroup): ResourceGroup[] {
    const subgroups: ResourceGroup[] = [];
    let currentResources: ArmResource[] = [];
    let currentSize = 0;
    let subgroupIndex = 0;

    for (const resource of group.resources) {
      const resourceSize = this.calculateResourceSize(resource);

      // Check if adding this resource would exceed limits
      if (
        currentSize + resourceSize > this.maxTemplateSize ||
        currentResources.length >= this.maxResourcesPerTemplate
      ) {
        // Create subgroup and start new one
        if (currentResources.length > 0) {
          subgroups.push({
            tier: group.tier,
            resources: currentResources,
            size: currentSize,
            name: `${group.name}-${subgroupIndex++}`,
          });
          currentResources = [];
          currentSize = 0;
        }
      }

      currentResources.push(resource);
      currentSize += resourceSize;
    }

    // Add final subgroup
    if (currentResources.length > 0) {
      subgroups.push({
        tier: group.tier,
        resources: currentResources,
        size: currentSize,
        name: `${group.name}-${subgroupIndex}`,
      });
    }

    return subgroups;
  }

  /**
   * Generate linked templates from resource groups
   */
  private generateLinkedTemplates(
    groups: ResourceGroup[],
    originalTemplate: ArmTemplate
  ): Map<string, ArmTemplate> {
    const linked = new Map<string, ArmTemplate>();

    // Build map of which resources belong to which template
    const resourceToTemplate = new Map<string, string>();
    for (const group of groups) {
      for (const resource of group.resources) {
        const resourceId = this.getResourceId(resource);
        resourceToTemplate.set(resourceId, group.name);
      }
    }

    for (const group of groups) {
      // Clean up cross-template dependencies from resources
      const cleanedResources = group.resources.map((resource) => {
        if (!resource.dependsOn || resource.dependsOn.length === 0) {
          return resource;
        }

        // Filter out dependencies to resources in other templates
        const cleanedDependsOn = resource.dependsOn.filter((dep) => {
          const depId = this.extractResourceIdFromDependsOn(dep);
          const depTemplate = resourceToTemplate.get(depId);
          return depTemplate === group.name; // Keep only same-template dependencies
        });

        // Return resource with cleaned dependsOn
        const cleanedResource = { ...resource };
        if (cleanedDependsOn.length > 0) {
          cleanedResource.dependsOn = cleanedDependsOn;
        } else {
          delete cleanedResource.dependsOn;
        }

        return cleanedResource;
      });

      const template: ArmTemplate = {
        $schema: originalTemplate.$schema,
        contentVersion: '1.0.0.0',
        parameters: {},
        variables: originalTemplate.variables || {},
        resources: cleanedResources,
        outputs: {},
      };

      linked.set(group.name, template);
    }

    return linked;
  }

  /**
   * Generate root template that orchestrates linked templates
   */
  private generateRootTemplate(
    linked: Map<string, ArmTemplate>,
    originalTemplate: ArmTemplate,
    dependencies: Map<string, string[]>
  ): ArmTemplate {
    const deploymentResources: ArmResource[] = [];

    // Create a deployment resource for each linked template
    for (const [name, template] of linked) {
      const deploymentResource: ArmResource = {
        type: 'Microsoft.Resources/deployments',
        apiVersion: '2022-09-01',
        name: name,
        properties: {
          mode: 'Incremental',
          templateLink: {
            uri: `[concat(parameters('_artifactsLocation'), '/', '${name}.json', parameters('_artifactsLocationSasToken'))]`,
          },
          parameters: {},
        },
      };

      // Add dependsOn if this template depends on other templates
      const templateDeps = dependencies.get(name);
      if (templateDeps && templateDeps.length > 0) {
        deploymentResource.dependsOn = templateDeps.map(
          (depName) => `[resourceId('Microsoft.Resources/deployments', '${depName}')]`
        );
      }

      deploymentResources.push(deploymentResource);
    }

    return {
      $schema: originalTemplate.$schema,
      contentVersion: '1.0.0.0',
      parameters: {
        _artifactsLocation: {
          type: 'string',
          metadata: {
            description: 'Base URI where artifacts are stored',
          },
        },
        _artifactsLocationSasToken: {
          type: 'secureString',
          defaultValue: '',
          metadata: {
            description: 'SAS token for accessing artifacts',
          },
        },
        ...originalTemplate.parameters,
      },
      variables: originalTemplate.variables,
      resources: deploymentResources,
      outputs: originalTemplate.outputs,
    };
  }

  /**
   * Calculate cross-template dependencies
   */
  private calculateCrossTemplateDependencies(
    linked: Map<string, ArmTemplate>,
    dependencyGraph: DependencyGraph
  ): Map<string, string[]> {
    const templateDeps = new Map<string, string[]>();

    // Map resources to templates
    const resourceToTemplate = new Map<string, string>();
    for (const [templateName, template] of linked) {
      for (const resource of template.resources) {
        const resourceId = this.getResourceId(resource);
        resourceToTemplate.set(resourceId, templateName);
      }
    }

    // Calculate cross-template dependencies
    for (const [templateName, template] of linked) {
      const deps = new Set<string>();

      for (const resource of template.resources) {
        const resourceId = this.getResourceId(resource);
        const resourceDeps = dependencyGraph.edges.get(resourceId);

        if (resourceDeps) {
          for (const depId of resourceDeps) {
            const depTemplateName = resourceToTemplate.get(depId);
            if (depTemplateName && depTemplateName !== templateName) {
              deps.add(depTemplateName);
            }
          }
        }
      }

      templateDeps.set(templateName, Array.from(deps));
    }

    return templateDeps;
  }

  /**
   * Topological sort for deployment order
   */
  private topologicalSort(templates: string[], dependencies: Map<string, string[]>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (template: string): void => {
      if (visited.has(template)) return;
      if (visiting.has(template)) {
        throw new Error(`Circular dependency detected involving template: ${template}`);
      }

      visiting.add(template);

      const deps = dependencies.get(template) || [];
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(template);
      visited.add(template);
      sorted.push(template);
    };

    for (const template of templates) {
      if (!visited.has(template)) {
        visit(template);
      }
    }

    return sorted;
  }

  /**
   * Get resource tier based on resource type
   */
  private getResourceTier(resourceType: string): ResourceTier {
    return this.tierMapping.get(resourceType) || ResourceTier.APPLICATION;
  }

  /**
   * Get resource ID for dependency tracking
   */
  private getResourceId(resource: ArmResource): string {
    return `${resource.type}/${resource.name}`;
  }

  /**
   * Extract resource ID from dependsOn string
   */
  private extractResourceIdFromDependsOn(dependsOn: string): string {
    // Handle ARM expression: [resourceId('type', 'name')]
    const match = dependsOn.match(/resourceId\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    // Fallback: assume it's already in type/name format
    return dependsOn;
  }

  /**
   * Calculate template size in bytes
   */
  private calculateTemplateSize(template: ArmTemplate): number {
    const json = JSON.stringify(template, null, 0);
    return new TextEncoder().encode(json).length;
  }

  /**
   * Calculate size of multiple resources
   */
  private calculateResourcesSize(resources: ArmResource[]): number {
    return resources.reduce((sum, resource) => sum + this.calculateResourceSize(resource), 0);
  }

  /**
   * Calculate size of a single resource in bytes
   */
  private calculateResourceSize(resource: ArmResource): number {
    const json = JSON.stringify(resource, null, 0);
    return new TextEncoder().encode(json).length;
  }
}
