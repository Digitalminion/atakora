# Glossary

Quick reference for technical terms used throughout Atakora documentation.

## A

**ADR (Architecture Decision Record)**
Documents important architectural decisions made during framework development. Each ADR explains the context, decision, and consequences of design choices. See [Architecture Decisions](./architecture/decisions/README.md).

**AMS (Azure Management Service)**
Azure's control plane for managing subscriptions, resource groups, and resources.

**API Version**
The version of the Azure Resource Manager API used for a specific resource type. Atakora uses the latest stable API versions when generating ARM templates.

**App**
The root construct that orchestrates synthesis and loads configuration. Every Atakora project starts with an `AzureApp` instance that contains one or more stacks. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

**ARM (Azure Resource Manager)**
Azure's deployment and management service that provides a consistent management layer. Atakora synthesizes TypeScript code into ARM templates for deployment. See [ARM Template Output Reference](./reference/arm-template-output.md).

**ARM Template**
JSON files that declaratively describe Azure infrastructure. Atakora generates these templates from your TypeScript code during synthesis.

**Assembly**
The synthesis phase where ARM templates are assembled from transformed resources. This includes grouping resources by stack, adding parameters and variables, and ordering resources by dependencies.

**Azure Government Cloud (Gov Cloud)**
Separate Azure cloud for US government agencies with additional compliance certifications. Atakora provides first-class support for Gov Cloud deployments.

**AzureApp**
The main entry point class for Atakora applications. Creates the root of the construct tree. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

## B

**Backend Pattern**
Production-ready infrastructure pattern for sharing resources (Functions, Cosmos, Storage) across multiple API components. Uses resource pooling to optimize costs. See [Backend Pattern Overview](./guides/patterns/backend/overview.md).

**Build-Time**
When Atakora code executes to build the construct tree. Atakora is a build-time framework, not a runtime framework - it generates static ARM templates.

**Bundling**
Process of packaging TypeScript/JavaScript code and dependencies into deployment-ready artifacts, particularly for Azure Functions.

## C

**CDK (Cloud Development Kit)**
Package structure for service-specific Azure resource constructs (`@atakora/cdk`). Contains L1 and L2 constructs organized by Microsoft namespace. See [CDK Package Architecture](./design/architecture/adr-003-cdk-package-architecture.md).

**Child Resource**
A resource that exists within the scope of a parent resource (e.g., Subnet within VirtualNetwork, BlobContainer within StorageAccount).

**CLI (Command-Line Interface)**
The `@atakora/cli` package providing commands for project initialization, synthesis, and deployment. See [CLI Reference](./reference/cli/README.md).

**Codegen (Code Generation)**
Automated tools that generate TypeScript types, validation logic, and L1 constructs from Azure ARM JSON schemas. See [Codegen Guide](./contributing/technical/codegen.md).

**Component**
High-level, production-ready infrastructure pattern in the `@atakora/component` package. Examples include CRUD backends and full-stack web applications.

**Construct**
Building block for defining infrastructure. All resources, stacks, and apps are constructs. Constructs form a hierarchical tree structure. See [Resources Guide](./guides/fundamentals/resources.md).

**Construct Tree**
Hierarchical structure of constructs where every resource knows its parent and children. Enables context inheritance, dependency tracking, and validation. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

**Context**
Configuration and metadata that flows down from parent to child constructs. Includes location, subscription ID, tags, and naming conventions.

**Context Inheritance**
Child resources automatically inherit configuration from parent constructs (e.g., tags set on a stack apply to all resources in that stack).

**CRUD**
Create, Read, Update, Delete - the four basic database operations. Atakora provides CRUD API factory patterns for quickly building data APIs.

**Cross-Stack Reference**
When a resource in one stack references a resource in another stack. Atakora automatically tracks these dependencies.

## D

**Dependency Graph**
Map of dependencies between resources built during synthesis. Ensures resources are deployed in the correct order.

**Deployment**
Process of applying ARM templates to Azure to create or update infrastructure. See [Deployment Guide](./guides/fundamentals/deployment.md).

**Deployment Scope**
The Azure scope where resources are deployed - either a resource group (ResourceGroupStack) or subscription (SubscriptionStack).

**dependsOn**
ARM template property that explicitly defines resource dependencies. Atakora generates these automatically based on resource references.

**Dev/Prod Split**
Pattern of creating separate infrastructure for development and production environments, typically using separate stacks or subscriptions.

## E

**Emit**
Final synthesis phase where ARM templates, parameters, and manifest files are written to the output directory.

**Environment Variable**
Configuration values passed to the application at runtime. Common examples: `AZURE_SUBSCRIPTION_ID`, `AZURE_LOCATION`.

## F

**Function App**
Azure Functions application resource. Requires runtime storage (automatically provisioned) and optionally application storage. See [Azure Functions Guide](./guides/azure-functions.md).

**Functions Storage**
Storage account used by Azure Functions for runtime operations. Must be separate from application data storage per ADR-001.

## G

**Gov Cloud**
See Azure Government Cloud.

## I

**IaC (Infrastructure as Code)**
Practice of managing infrastructure through code rather than manual processes. Atakora is a type-safe IaC framework for Azure.

**ID (Resource ID)**
Azure Resource Manager identifier for a resource. Format: `/subscriptions/{sub}/resourceGroups/{rg}/providers/{type}/{name}`.

**IntelliSense**
IDE feature providing autocomplete and inline documentation. Atakora's TypeScript-first approach enables full IntelliSense support.

**Intent-Based API**
High-level API (L2 constructs) that expresses developer intent rather than low-level configuration details.

## L

**L1 Construct (Level 1)**
Low-level construct that maps 1:1 to an ARM resource type. Generated from ARM schemas. Prefixed with `Arm` (e.g., `ArmStorageAccount`).

**L2 Construct (Level 2)**
High-level construct providing developer-friendly APIs with sensible defaults and intent-based configuration (e.g., `StorageAccounts`, `VirtualNetworks`).

**Linked Templates**
ARM template pattern where a main template references child templates stored externally (e.g., in Azure Blob Storage). Used to overcome the 4MB ARM template size limit. See [ADR-016](./design/architecture/adr-016-linked-templates-default.md).

**Location**
Azure region where resources are deployed (e.g., `eastus2`, `westus2`). Inherited from stack context.

## M

**Manifest**
JSON file (`manifest.json`) generated during synthesis containing metadata about stacks, resources, and deployment configuration.

**Microsoft Namespace**
Azure resource provider namespace (e.g., `Microsoft.Network`, `Microsoft.Storage`, `Microsoft.Web`). CDK constructs are organized by namespace.

**Monorepo**
Repository structure containing multiple related packages. Atakora uses npm workspaces for monorepo management.

**Multi-Package Project**
Atakora project organized into multiple packages for better modularity and team collaboration. See [Multi-Package Projects Guide](./guides/multi-package-projects.md).

## N

**Naming Conventions**
Azure-specific naming rules and best practices. Atakora provides `AzureNaming` utilities to ensure names follow Azure constraints. See [Naming Conventions](./reference/naming-conventions.md).

**Nonprod**
Non-production environments (dev, test, staging).

**npm Workspace**
npm feature for managing multiple packages in a monorepo. Atakora projects use workspaces to organize infrastructure packages.

## O

**Output**
ARM template output that exports resource properties for use by other systems or CI/CD pipelines.

**Outdir**
Output directory where synthesized ARM templates are written. Default: `./arm.out`.

## P

**Parameters**
ARM template parameters that allow runtime configuration of infrastructure. Atakora automatically generates parameters for configurable values.

**Parent-Child Relationship**
Hierarchical relationship in the construct tree where each construct has a parent (scope) and may have children.

**Progressive Disclosure**
Documentation pattern that starts simple and gradually introduces complexity. Core principle of Atakora's learning materials.

**Properties**
Configuration object passed to a construct constructor. Defines the resource's characteristics and behavior.

## R

**RBAC (Role-Based Access Control)**
Azure's authorization system. Atakora provides `grant*` methods for defining RBAC permissions. See [RBAC Pattern](./design/architecture/adr-013-azure-rbac-grant-pattern.md).

**Resource**
Azure infrastructure component (VNet, Storage Account, Web App, etc.). Represented as constructs in Atakora.

**Resource Group**
Azure container for related resources. Most Atakora stacks deploy to a resource group scope.

**Resource Group Stack**
Stack that deploys resources to a specific resource group. Most common stack type. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

**Resource ID**
See ID (Resource ID).

**Resource Pooling**
Backend pattern technique where multiple components share infrastructure resources (Functions, Cosmos, Storage) to reduce costs and complexity.

**Resource Provider**
Component that manages provisioning of shared resources in the backend pattern. Examples: CosmosProvider, FunctionsProvider, StorageProvider.

**Resource Reference**
When one resource refers to another resource (e.g., using a resource's ID or name property). Creates automatic dependencies.

**Resource Type**
Azure Resource Manager type identifier (e.g., `Microsoft.Storage/storageAccounts`, `Microsoft.Network/virtualNetworks`).

**ResourceGroupStack**
Stack class for deploying to a resource group scope. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

## S

**Schema**
JSON schema from Azure that defines the structure and validation rules for ARM resource types. Atakora generates types and validation from schemas.

**Scope**
Parent construct in the construct tree. The first parameter when creating any construct.

**Semver (Semantic Versioning)**
Versioning scheme (MAJOR.MINOR.PATCH) used for Atakora releases.

**SKU (Stock Keeping Unit)**
Azure pricing tier and capability level for a resource (e.g., `Standard_LRS`, `Premium_GRS` for storage accounts).

**Stack**
Deployment boundary representing either a resource group or subscription scope. Contains resources and maps to a single ARM template. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

**Stack Context**
Configuration inherited by all resources in a stack (location, subscription, tags, etc.).

**Stack Output**
Value exported from a stack's ARM template for external use.

**Strict Mode**
Validation configuration that treats warnings as errors during synthesis.

**Subnet**
Subdivision of a virtual network's address space. Child resource of VirtualNetwork.

**SubscriptionStack**
Stack that deploys resources at the subscription level. Used for foundational resources like resource groups and policies. See [App and Stacks Guide](./guides/fundamentals/app-and-stacks.md).

**Synthesis**
Process of transforming the construct tree into ARM templates. Occurs when `app.synth()` is called. See [Synthesis Guide](./guides/fundamentals/synthesis.md).

**Synthesis Pipeline**
Multi-phase process: Prepare → Validate → Traverse → Transform → Assemble → Emit. See [Synthesis Guide](./guides/fundamentals/synthesis.md).

## T

**Tags**
Key-value metadata attached to Azure resources for organization, cost tracking, and automation. Inherited from stack to resources.

**Template**
See ARM Template.

**Transform**
Synthesis phase where constructs are converted to ARM JSON resources by calling `toArmTemplate()` on each resource.

**Traverse**
Synthesis phase where the construct tree is walked depth-first to collect all resources.

**TSDoc**
TypeScript documentation comments used to generate API reference documentation.

**Type Safety**
TypeScript's compile-time type checking that catches configuration errors before deployment.

## V

**Validation**
5-layer system that checks infrastructure code for errors: TypeScript types, schema validation, naming rules, resource constraints, and deployment validation. See [Validation Overview](./guides/validation/overview.md).

**Variables**
ARM template variables that store computed or derived values used throughout the template.

**Virtual Network (VNet)**
Azure networking resource providing isolated network space. Contains subnets.

## W

**Watch Mode**
CLI mode that automatically re-synthesizes ARM templates when source files change.

**Workspace**
See npm Workspace.

## See Also

- [Documentation Index](./INDEX.md) - Alphabetical index of all documentation pages
- [Getting Started](./getting-started/README.md) - New to Atakora? Start here
- [Reference Documentation](./reference/README.md) - Complete API and CLI reference
- [Troubleshooting](./troubleshooting/common-issues.md) - Common problems and solutions
