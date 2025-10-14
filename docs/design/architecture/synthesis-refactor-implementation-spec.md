# Synthesis Pipeline Refactoring: Implementation Specifications

## Overview

This document provides detailed implementation specifications for the context-aware synthesis pipeline refactoring. Each component specification includes interfaces, method signatures, and implementation guidance.

## 1. ResourceMetadata Interface

**File:** `packages/lib/src/synthesis/types.ts`

```typescript
/**
 * Lightweight metadata for resource template assignment decisions
 */
export interface ResourceMetadata {
  /** Unique identifier for this resource instance */
  id: string;

  /** ARM resource type (e.g., 'Microsoft.Web/sites') */
  type: string;

  /** Resource name as it appears in ARM template */
  name: string;

  /** Resource IDs this resource depends on */
  dependencies: string[];

  /** Estimated size of ARM JSON representation in bytes */
  sizeEstimate: number;

  /** Resources that MUST be in the same template (e.g., function app and its config) */
  requiresSameTemplate?: string[];

  /** Hint for template placement preference */
  templatePreference?: 'main' | 'linked' | 'any';

  /** Resource-specific metadata for assignment decisions */
  metadata?: {
    /** True if this resource generates large inline content */
    hasLargeInlineContent?: boolean;

    /** True if this resource is frequently referenced by others */
    isHighlyReferenced?: boolean;

    /** Custom hints for template assignment */
    assignmentHints?: Record<string, any>;
  };
}
```

## 2. SynthesisContext Class

**File:** `packages/lib/src/synthesis/context/synthesis-context.ts`

```typescript
import { ArmExpression, ArmParameter } from '../types';

/**
 * Provides context about template assignments during ARM generation
 */
export class SynthesisContext {
  /** The template this resource is assigned to */
  public readonly currentTemplate: string;

  /** Map of all resource IDs to their assigned templates */
  private readonly resourceTemplates: Map<string, string>;

  /** Metadata about each template */
  private readonly templateMetadata: Map<string, TemplateMetadata>;

  constructor(
    currentTemplate: string,
    resourceTemplates: Map<string, string>,
    templateMetadata: Map<string, TemplateMetadata>
  ) {
    this.currentTemplate = currentTemplate;
    this.resourceTemplates = resourceTemplates;
    this.templateMetadata = templateMetadata;
  }

  /**
   * Get a reference to a resource, handling cross-template scenarios
   */
  getResourceReference(resourceId: string): ArmExpression {
    const targetTemplate = this.resourceTemplates.get(resourceId);

    if (!targetTemplate) {
      throw new Error(`Resource ${resourceId} not found in template assignments`);
    }

    if (targetTemplate === this.currentTemplate) {
      // Same template - direct reference
      return {
        type: 'function',
        name: 'resourceId',
        parameters: [this.parseResourceId(resourceId)]
      };
    } else {
      // Cross-template - use deployment output
      return this.getCrossTemplateReference(resourceId);
    }
  }

  /**
   * Get a reference to a parameter, handling cross-template scenarios
   */
  getParameterReference(paramName: string): ArmExpression {
    const metadata = this.templateMetadata.get(this.currentTemplate);

    if (metadata?.parameters?.has(paramName)) {
      // Parameter exists in current template
      return {
        type: 'function',
        name: 'parameters',
        parameters: [paramName]
      };
    } else {
      // Parameter might be in parent template - return as-is
      // The parent template will handle parameter propagation
      return {
        type: 'function',
        name: 'parameters',
        parameters: [paramName]
      };
    }
  }

  /**
   * Get a cross-template reference using deployment outputs
   */
  getCrossTemplateReference(resourceId: string, expression?: string): ArmExpression {
    const targetTemplate = this.resourceTemplates.get(resourceId);

    if (!targetTemplate || targetTemplate === this.currentTemplate) {
      throw new Error(`Invalid cross-template reference for ${resourceId}`);
    }

    // Generate reference through deployment output
    const deploymentName = this.getDeploymentName(targetTemplate);
    const outputName = this.getOutputName(resourceId, expression);

    return {
      type: 'function',
      name: 'reference',
      parameters: [
        {
          type: 'function',
          name: 'resourceId',
          parameters: ['Microsoft.Resources/deployments', deploymentName]
        },
        'outputs',
        outputName,
        'value'
      ]
    };
  }

  /**
   * Check if a resource is in the same template
   */
  isInSameTemplate(resourceId: string): boolean {
    return this.resourceTemplates.get(resourceId) === this.currentTemplate;
  }

  /**
   * Get all resources in the current template
   */
  getResourcesInCurrentTemplate(): string[] {
    return Array.from(this.resourceTemplates.entries())
      .filter(([_, template]) => template === this.currentTemplate)
      .map(([id, _]) => id);
  }

  private parseResourceId(resourceId: string): any {
    // Parse the resource ID into type and name components
    const parts = resourceId.split('/');
    return {
      type: parts.slice(0, -1).join('/'),
      name: parts[parts.length - 1]
    };
  }

  private getDeploymentName(template: string): string {
    // Generate deployment name from template name
    return template.replace('.json', '-deployment');
  }

  private getOutputName(resourceId: string, expression?: string): string {
    // Generate output name for cross-template reference
    const resourceName = resourceId.split('/').pop();
    return expression ? `${resourceName}_${expression}` : `${resourceName}_id`;
  }
}

/**
 * Metadata about a template
 */
export interface TemplateMetadata {
  /** Template file name */
  fileName: string;

  /** Template URI for linked deployments */
  uri?: string;

  /** Parameters defined in this template */
  parameters?: Set<string>;

  /** Outputs defined in this template */
  outputs?: Set<string>;

  /** Whether this is the main template */
  isMain: boolean;
}
```

## 3. TemplateAssignments Type System

**File:** `packages/lib/src/synthesis/types.ts`

```typescript
/**
 * Result of template assignment phase
 */
export interface TemplateAssignments {
  /** Map of resource IDs to assigned template names */
  assignments: Map<string, string>;

  /** Metadata for each template */
  templates: Map<string, TemplateInfo>;

  /** Cross-template dependencies */
  crossTemplateDependencies: CrossTemplateDependency[];
}

/**
 * Information about a template
 */
export interface TemplateInfo {
  /** Template file name */
  name: string;

  /** Resources assigned to this template */
  resources: string[];

  /** Estimated size in bytes */
  estimatedSize: number;

  /** Whether this is the main template */
  isMain: boolean;

  /** Templates this one depends on */
  dependsOn: string[];
}

/**
 * Represents a dependency between templates
 */
export interface CrossTemplateDependency {
  /** Source template containing the dependent resource */
  sourceTemplate: string;

  /** Target template containing the dependency */
  targetTemplate: string;

  /** The resource creating the dependency */
  sourceResource: string;

  /** The resource being depended upon */
  targetResource: string;

  /** Type of dependency */
  dependencyType: 'reference' | 'dependsOn' | 'output';
}

/**
 * Options for template assignment
 */
export interface TemplateAssignmentOptions {
  /** Maximum template size in bytes (default: 4MB) */
  maxTemplateSize?: number;

  /** Strategy for grouping resources */
  groupingStrategy?: 'minimize-cross-refs' | 'resource-type' | 'dependency-chain';

  /** Whether to use linked templates by default */
  preferLinkedTemplates?: boolean;

  /** Custom grouping rules */
  customGrouping?: (metadata: ResourceMetadata[]) => Map<string, string[]>;
}
```

## 4. Updated Resource Base Class

**File:** `packages/lib/src/core/resource.ts`

```typescript
import { ResourceMetadata } from '../synthesis/types';
import { SynthesisContext } from '../synthesis/context/synthesis-context';

export abstract class Resource {
  protected readonly id: string;
  protected readonly type: string;
  protected readonly name: string;
  protected dependencies: string[] = [];

  /**
   * Generate lightweight metadata for template assignment
   * @returns Metadata for this resource
   */
  abstract toMetadata(): ResourceMetadata;

  /**
   * Generate ARM template representation with context
   * @param context - Optional synthesis context for cross-template references
   * @returns ARM resource object
   */
  abstract toArmTemplate(context?: SynthesisContext): any;

  /**
   * Backwards compatibility wrapper
   * @deprecated Use toArmTemplate(context) instead
   */
  toArmTemplateCompat(): any {
    console.warn(`Resource ${this.id} using deprecated toArmTemplateCompat()`);
    return this.toArmTemplate();
  }

  /**
   * Estimate the size of this resource's ARM JSON representation
   * @returns Estimated size in bytes
   */
  protected estimateSize(): number {
    // Base estimation logic - can be overridden
    const baseSize = 500; // Base JSON structure
    const nameSize = this.name.length * 2; // Unicode consideration
    const typeSize = this.type.length;
    const dependencySize = this.dependencies.length * 100; // Rough estimate per dependency

    return baseSize + nameSize + typeSize + dependencySize;
  }

  /**
   * Get resources that must be in the same template
   * @returns Array of resource IDs
   */
  protected getRequiredColocatedResources(): string[] {
    // Override in subclasses for resources that must stay together
    return [];
  }
}
```

## 5. Template Splitter Refactoring

**File:** `packages/lib/src/synthesis/assembly/template-splitter.ts`

```typescript
import { ResourceMetadata, TemplateAssignments, TemplateAssignmentOptions } from '../types';

export class TemplateSplitter {
  private readonly options: Required<TemplateAssignmentOptions>;

  constructor(options: TemplateAssignmentOptions = {}) {
    this.options = {
      maxTemplateSize: options.maxTemplateSize ?? 4 * 1024 * 1024, // 4MB
      groupingStrategy: options.groupingStrategy ?? 'minimize-cross-refs',
      preferLinkedTemplates: options.preferLinkedTemplates ?? false,
      customGrouping: options.customGrouping ?? null
    };
  }

  /**
   * Split resources into templates based on metadata
   */
  splitByMetadata(metadata: ResourceMetadata[]): TemplateAssignments {
    // Step 1: Build dependency graph
    const graph = this.buildDependencyGraph(metadata);

    // Step 2: Apply custom grouping if provided
    if (this.options.customGrouping) {
      return this.applyCustomGrouping(metadata, graph);
    }

    // Step 3: Apply grouping strategy
    switch (this.options.groupingStrategy) {
      case 'minimize-cross-refs':
        return this.minimizeCrossReferences(metadata, graph);
      case 'resource-type':
        return this.groupByResourceType(metadata, graph);
      case 'dependency-chain':
        return this.groupByDependencyChain(metadata, graph);
      default:
        throw new Error(`Unknown grouping strategy: ${this.options.groupingStrategy}`);
    }
  }

  private buildDependencyGraph(metadata: ResourceMetadata[]): DependencyGraph {
    const graph = new DependencyGraph();

    for (const resource of metadata) {
      graph.addNode(resource.id, resource);

      for (const dep of resource.dependencies) {
        graph.addEdge(resource.id, dep);
      }

      // Handle must-colocate constraints
      if (resource.requiresSameTemplate) {
        for (const required of resource.requiresSameTemplate) {
          graph.addConstraint(resource.id, required, 'must-colocate');
        }
      }
    }

    return graph;
  }

  private minimizeCrossReferences(
    metadata: ResourceMetadata[],
    graph: DependencyGraph
  ): TemplateAssignments {
    // Implementation: Use graph partitioning to minimize edge cuts
    const partitions = this.partitionGraph(graph);
    return this.createAssignments(partitions, metadata);
  }

  private groupByResourceType(
    metadata: ResourceMetadata[],
    graph: DependencyGraph
  ): TemplateAssignments {
    // Group resources by their ARM type
    const groups = new Map<string, ResourceMetadata[]>();

    for (const resource of metadata) {
      const baseType = resource.type.split('/')[0]; // e.g., "Microsoft.Web"
      if (!groups.has(baseType)) {
        groups.set(baseType, []);
      }
      groups.get(baseType)!.push(resource);
    }

    return this.createAssignmentsFromGroups(groups, graph);
  }

  private groupByDependencyChain(
    metadata: ResourceMetadata[],
    graph: DependencyGraph
  ): TemplateAssignments {
    // Use topological sort to find dependency chains
    const chains = graph.findDependencyChains();
    return this.createAssignmentsFromChains(chains, metadata);
  }

  private partitionGraph(graph: DependencyGraph): Map<string, ResourceMetadata[]> {
    // Implement graph partitioning algorithm (e.g., Kernighan-Lin)
    // This is a simplified placeholder
    const partitions = new Map<string, ResourceMetadata[]>();
    let currentPartition = 'main.json';
    let currentSize = 0;

    for (const node of graph.topologicalSort()) {
      const resource = graph.getNodeData(node);

      if (currentSize + resource.sizeEstimate > this.options.maxTemplateSize) {
        // Start new partition
        currentPartition = `linked-${partitions.size}.json`;
        currentSize = 0;
      }

      if (!partitions.has(currentPartition)) {
        partitions.set(currentPartition, []);
      }

      partitions.get(currentPartition)!.push(resource);
      currentSize += resource.sizeEstimate;
    }

    return partitions;
  }

  private createAssignments(
    partitions: Map<string, ResourceMetadata[]>,
    metadata: ResourceMetadata[]
  ): TemplateAssignments {
    const assignments = new Map<string, string>();
    const templates = new Map<string, TemplateInfo>();
    const crossTemplateDeps: CrossTemplateDependency[] = [];

    // Create assignments
    for (const [templateName, resources] of partitions) {
      for (const resource of resources) {
        assignments.set(resource.id, templateName);
      }

      templates.set(templateName, {
        name: templateName,
        resources: resources.map(r => r.id),
        estimatedSize: resources.reduce((sum, r) => sum + r.sizeEstimate, 0),
        isMain: templateName === 'main.json',
        dependsOn: []
      });
    }

    // Identify cross-template dependencies
    for (const resource of metadata) {
      const sourceTemplate = assignments.get(resource.id)!;

      for (const dep of resource.dependencies) {
        const targetTemplate = assignments.get(dep);

        if (targetTemplate && targetTemplate !== sourceTemplate) {
          crossTemplateDeps.push({
            sourceTemplate,
            targetTemplate,
            sourceResource: resource.id,
            targetResource: dep,
            dependencyType: 'dependsOn'
          });

          // Update template dependencies
          const templateInfo = templates.get(sourceTemplate)!;
          if (!templateInfo.dependsOn.includes(targetTemplate)) {
            templateInfo.dependsOn.push(targetTemplate);
          }
        }
      }
    }

    return { assignments, templates, crossTemplateDependencies: crossTemplateDeps };
  }
}

/**
 * Internal dependency graph implementation
 */
class DependencyGraph {
  private nodes = new Map<string, ResourceMetadata>();
  private edges = new Map<string, Set<string>>();
  private constraints = new Map<string, Map<string, string>>();

  addNode(id: string, data: ResourceMetadata): void {
    this.nodes.set(id, data);
    if (!this.edges.has(id)) {
      this.edges.set(id, new Set());
    }
  }

  addEdge(from: string, to: string): void {
    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    this.edges.get(from)!.add(to);
  }

  addConstraint(resource1: string, resource2: string, type: string): void {
    if (!this.constraints.has(resource1)) {
      this.constraints.set(resource1, new Map());
    }
    this.constraints.get(resource1)!.set(resource2, type);
  }

  getNodeData(id: string): ResourceMetadata {
    return this.nodes.get(id)!;
  }

  topologicalSort(): string[] {
    // Implement topological sort
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);

      const deps = this.edges.get(node) || new Set();
      for (const dep of deps) {
        visit(dep);
      }

      result.push(node);
    };

    for (const node of this.nodes.keys()) {
      visit(node);
    }

    return result;
  }

  findDependencyChains(): string[][] {
    // Find connected components / dependency chains
    const chains: string[][] = [];
    const visited = new Set<string>();

    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        const chain: string[] = [];
        const queue = [node];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;

          visited.add(current);
          chain.push(current);

          const deps = this.edges.get(current) || new Set();
          for (const dep of deps) {
            queue.push(dep);
          }
        }

        chains.push(chain);
      }
    }

    return chains;
  }
}
```

## 6. Synthesizer Pipeline Refactoring

**File:** `packages/lib/src/synthesis/synthesizer.ts`

```typescript
export class Synthesizer {
  private readonly options: SynthesizerOptions;

  async synthesize(app: App): Promise<void> {
    console.log('Starting context-aware synthesis pipeline...');

    // Phase 1: Collect metadata
    const metadata = await this.collectMetadata(app);
    console.log(`Collected metadata for ${metadata.length} resources`);

    // Phase 2: Assign templates
    const assignments = await this.assignTemplates(metadata);
    console.log(`Assigned resources to ${assignments.templates.size} templates`);

    // Phase 3: Generate ARM with context
    const templates = await this.generateArm(app, assignments);
    console.log(`Generated ${templates.size} ARM templates`);

    // Phase 4: Write artifacts
    await this.writeArtifacts(templates, assignments);
    console.log('Synthesis complete!');
  }

  private async collectMetadata(app: App): Promise<ResourceMetadata[]> {
    const metadata: ResourceMetadata[] = [];

    for (const stack of app.stacks) {
      for (const resource of stack.resources) {
        try {
          const resourceMeta = resource.toMetadata();
          metadata.push(resourceMeta);
        } catch (error) {
          // Backwards compatibility: generate minimal metadata
          console.warn(`Resource ${resource.id} doesn't implement toMetadata(), using fallback`);
          metadata.push(this.generateFallbackMetadata(resource));
        }
      }
    }

    return metadata;
  }

  private async assignTemplates(metadata: ResourceMetadata[]): Promise<TemplateAssignments> {
    const splitter = new TemplateSplitter(this.options.splitter);
    return splitter.splitByMetadata(metadata);
  }

  private async generateArm(app: App, assignments: TemplateAssignments): Promise<Map<string, any>> {
    const templates = new Map<string, any>();

    for (const [templateName, templateInfo] of assignments.templates) {
      const context = new SynthesisContext(
        templateName,
        assignments.assignments,
        assignments.templates
      );

      const template = await this.generateTemplate(app, templateInfo, context);
      templates.set(templateName, template);
    }

    return templates;
  }

  private async generateTemplate(
    app: App,
    templateInfo: TemplateInfo,
    context: SynthesisContext
  ): Promise<any> {
    const template = {
      '$schema': 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      parameters: {},
      variables: {},
      resources: [],
      outputs: {}
    };

    // Generate resources for this template
    for (const resourceId of templateInfo.resources) {
      const resource = this.findResource(app, resourceId);
      if (resource) {
        try {
          const armResource = resource.toArmTemplate(context);
          template.resources.push(armResource);
        } catch (error) {
          // Backwards compatibility
          console.warn(`Resource ${resourceId} doesn't support context, using fallback`);
          const armResource = resource.toArmTemplate();
          template.resources.push(armResource);
        }
      }
    }

    // Add outputs for cross-template references
    this.addTemplateOutputs(template, templateInfo, context);

    return template;
  }

  private generateFallbackMetadata(resource: any): ResourceMetadata {
    // Generate minimal metadata for resources that haven't been migrated
    return {
      id: resource.id || 'unknown',
      type: resource.type || 'unknown',
      name: resource.name || 'unknown',
      dependencies: resource.dependencies || [],
      sizeEstimate: 1000, // Conservative estimate
      templatePreference: 'any'
    };
  }
}
```

## Implementation Priorities

### Phase 1: Core Infrastructure (Day 1)
1. **ResourceMetadata interface** - Define in types.ts
2. **SynthesisContext class** - Implement with full test coverage
3. **TemplateAssignments types** - Complete type system
4. **Resource base class update** - Add toMetadata() method

### Phase 2: Template Splitting (Day 1-2)
1. **TemplateSplitter refactoring** - Metadata-based splitting
2. **Dependency graph implementation** - For optimization
3. **Assignment strategies** - Multiple grouping options

### Phase 3: Pipeline Integration (Day 2-3)
1. **Synthesizer refactoring** - New phased pipeline
2. **ResourceTransformer updates** - Context propagation
3. **Backwards compatibility** - Support unmigrated resources

### Phase 4: Resource Migration (Day 3-4)
1. **Critical resources first** - FunctionApp, StorageAccount
2. **L1 constructs** - Systematic migration
3. **L2 constructs** - Update high-level abstractions

### Phase 5: Testing & Validation (Day 3-4)
1. **Unit tests** - Each component individually
2. **Integration tests** - Complete pipeline
3. **E2E tests** - Actual deployments
4. **Performance benchmarks** - Memory and time metrics

## Success Metrics

1. **No unresolved placeholders** in generated templates
2. **Cross-template references work** correctly
3. **Backwards compatibility** maintained during migration
4. **Performance impact** < 20% synthesis time increase
5. **Test coverage** > 95% for new components
6. **Zero regression** in existing functionality

## Migration Checklist

For each resource being migrated:

- [ ] Implement `toMetadata()` method
- [ ] Update `toArmTemplate()` to accept optional context
- [ ] Add size estimation logic
- [ ] Define `requiresSameTemplate` constraints if needed
- [ ] Update unit tests
- [ ] Test cross-template scenarios
- [ ] Update documentation
- [ ] Verify backwards compatibility