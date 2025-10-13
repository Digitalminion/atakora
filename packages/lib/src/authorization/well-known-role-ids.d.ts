/**
 * Azure RBAC - Well-Known Role IDs registry.
 *
 * @remarks
 * This module provides access to Azure's built-in role definitions.
 * Role GUIDs are consistent across all Azure environments (Commercial, Government, China).
 *
 * @packageDocumentation
 */
/**
 * Registry of Azure built-in role definition IDs.
 *
 * @remarks
 * Provides strongly-typed access to Azure's built-in roles.
 * Each property returns an ARM expression that resolves to the full role definition resource ID.
 *
 * **Azure Role Definition Format**:
 * `/subscriptions/{subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/{roleGuid}`
 *
 * **Role GUID Consistency**:
 * Role GUIDs are the same across all Azure environments:
 * - Azure Commercial Cloud
 * - Azure Government (US)
 * - Azure China (Mooncake)
 *
 * This allows infrastructure code to work across clouds without modification.
 *
 * **Usage in Grants**:
 * These role IDs are typically used with grant methods on resources:
 *
 * @public
 *
 * @example
 * Using with storage account:
 * ```typescript
 * storageAccount.grantBlobRead(vm); // Uses STORAGE_BLOB_DATA_READER internally
 * ```
 *
 * @example
 * Using with RoleAssignment directly:
 * ```typescript
 * new RoleAssignment(stack, 'BlobReader', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   principalId: vm.principalId,
 *   principalType: PrincipalType.ManagedIdentity
 * });
 * ```
 *
 * @example
 * Custom grant implementation:
 * ```typescript
 * public grantCustomAccess(grantable: IGrantable): IGrantResult {
 *   return this.grant(
 *     grantable,
 *     WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
 *     'Custom description'
 *   );
 * }
 * ```
 */
export declare class WellKnownRoleIds {
    /**
     * Read access to all resources.
     *
     * @remarks
     * Provides read-only access to view all resources but does not allow modifications.
     * This is the most restrictive built-in role for viewing resources.
     *
     * **Common Use Cases**:
     * - Auditors reviewing resource configurations
     * - Monitoring and alerting systems
     * - Read-only dashboards
     * - Cost analysis tools
     *
     * **Scope**: Can be assigned at subscription, resource group, or resource level.
     *
     * **Role GUID**: `acdd72a7-3385-48ef-bd42-f606fba81ae7`
     */
    static readonly READER: string;
    /**
     * Create and manage all types of Azure resources.
     *
     * @remarks
     * Provides full access to all resources except the ability to assign roles.
     * This is the standard role for managing resources.
     *
     * **Permissions**:
     * - Create, read, update, delete resources
     * - Manage resource locks
     * - Configure resource settings
     *
     * **Limitations**:
     * - Cannot assign roles (requires Owner or User Access Administrator)
     * - Cannot modify management groups
     *
     * **Common Use Cases**:
     * - Development and testing environments
     * - Infrastructure management
     * - Automation accounts
     *
     * **Scope**: Can be assigned at subscription, resource group, or resource level.
     *
     * **Role GUID**: `b24988ac-6180-42a0-ab88-20f7382dd24c`
     */
    static readonly CONTRIBUTOR: string;
    /**
     * Full access to all resources, including the ability to assign roles.
     *
     * @remarks
     * The most privileged built-in role. Use sparingly and only when necessary.
     *
     * **Permissions**:
     * - All Contributor permissions
     * - Assign roles in Azure RBAC
     * - Manage access policies
     * - Modify management groups
     *
     * **Security Consideration**:
     * Owner can grant themselves any permission, so assign carefully.
     *
     * **Common Use Cases**:
     * - Subscription administrators
     * - Security teams managing access
     * - Break-glass accounts
     *
     * **Scope**: Can be assigned at subscription, resource group, or resource level.
     *
     * **Role GUID**: `8e3af657-a8ff-443c-a75c-2fe8c4bcb635`
     */
    static readonly OWNER: string;
    /**
     * Manage user access to Azure resources.
     *
     * @remarks
     * Allows management of user access without providing access to resources themselves.
     *
     * **Permissions**:
     * - View all resources
     * - Assign roles to users, groups, and service principals
     * - Manage access reviews
     *
     * **Common Use Cases**:
     * - Identity and access management teams
     * - Delegated access management
     * - Security administrators
     *
     * **Scope**: Typically assigned at subscription or resource group level.
     *
     * **Role GUID**: `18d7d88d-d35e-4fb5-a5c3-7773c20a72d9`
     */
    static readonly USER_ACCESS_ADMINISTRATOR: string;
    /**
     * Read blob data and metadata.
     *
     * @remarks
     * Provides read-only access to blob containers and blobs.
     * Supports ABAC conditions for fine-grained control.
     *
     * **Permissions**:
     * - Read blob content
     * - Read blob metadata
     * - List blobs in containers
     *
     * **Common Use Cases**:
     * - Applications reading configuration files
     * - Data processing pipelines reading input data
     * - Backup systems reading source data
     *
     * **Role GUID**: `2a2b9908-6ea1-4ae2-8e65-a410df84e7d1`
     */
    static readonly STORAGE_BLOB_DATA_READER: string;
    /**
     * Read, write, and delete blob data.
     *
     * @remarks
     * Provides full access to blob data except for managing access policies.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - All STORAGE_BLOB_DATA_READER permissions
     * - Write blob content
     * - Delete blobs
     * - Manage blob metadata
     *
     * **Common Use Cases**:
     * - Applications uploading and downloading files
     * - Data processing pipelines
     * - Backup and restore systems
     *
     * **Role GUID**: `ba92f5b4-2d11-453d-a403-e96b0029c9fe`
     */
    static readonly STORAGE_BLOB_DATA_CONTRIBUTOR: string;
    /**
     * Full access to blob data, including setting POSIX ACLs.
     *
     * @remarks
     * Highest level of blob access, including ACL management for Data Lake Storage Gen2.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - All STORAGE_BLOB_DATA_CONTRIBUTOR permissions
     * - Set POSIX ACLs (Data Lake Storage Gen2)
     * - Manage blob access policies
     *
     * **Common Use Cases**:
     * - Data lake administrators
     * - File system migration tools
     * - Advanced data management scenarios
     *
     * **Role GUID**: `b7e6dc6d-f1e8-4753-8033-0f276bb0955b`
     */
    static readonly STORAGE_BLOB_DATA_OWNER: string;
    /**
     * Read queue messages and metadata.
     *
     * @remarks
     * Provides read-only access to queue messages.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Peek queue messages
     * - Read queue metadata
     * - List queues
     *
     * **Common Use Cases**:
     * - Monitoring and observability systems
     * - Queue depth analysis
     *
     * **Role GUID**: `19e7f393-937e-4f77-808e-94535e297925`
     */
    static readonly STORAGE_QUEUE_DATA_READER: string;
    /**
     * Read, write, and delete queue messages.
     *
     * @remarks
     * Full access to queue data.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - All STORAGE_QUEUE_DATA_READER permissions
     * - Add messages to queue
     * - Process (read and delete) messages
     * - Update message content
     *
     * **Common Use Cases**:
     * - Queue-based applications
     * - Message processors
     * - Workflow engines
     *
     * **Role GUID**: `974c5e8b-45b9-4653-ba55-5f855dd0fb88`
     */
    static readonly STORAGE_QUEUE_DATA_CONTRIBUTOR: string;
    /**
     * Send messages to storage queues.
     *
     * @remarks
     * Minimal permission for sending messages only.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Add messages to queues
     *
     * **Common Use Cases**:
     * - Message producers
     * - Event publishers
     * - Notification systems
     *
     * **Role GUID**: `c6a89b2d-59bc-44d0-9896-0f6e12d7b80a`
     */
    static readonly STORAGE_QUEUE_DATA_MESSAGE_SENDER: string;
    /**
     * Process (read and delete) queue messages.
     *
     * @remarks
     * Permission to receive and process messages.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Read messages from queue
     * - Delete messages after processing
     * - Update message visibility timeout
     *
     * **Common Use Cases**:
     * - Queue consumers
     * - Message processors
     * - Worker roles
     *
     * **Role GUID**: `8a0f0c08-91a1-4084-bc3d-661d67233fed`
     */
    static readonly STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR: string;
    /**
     * Read table data and entities.
     *
     * @remarks
     * Read-only access to Azure Table Storage.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Query table entities
     * - Read table metadata
     * - List tables
     *
     * **Common Use Cases**:
     * - Read-only data access
     * - Reporting systems
     * - Data analysis
     *
     * **Role GUID**: `76199698-9eea-4c19-bc75-cec21354c6b6`
     */
    static readonly STORAGE_TABLE_DATA_READER: string;
    /**
     * Read, write, and delete table data.
     *
     * @remarks
     * Full access to Azure Table Storage data.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - All STORAGE_TABLE_DATA_READER permissions
     * - Insert entities
     * - Update entities
     * - Delete entities
     *
     * **Common Use Cases**:
     * - Applications using table storage
     * - Data management tools
     * - ETL processes
     *
     * **Role GUID**: `0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3`
     */
    static readonly STORAGE_TABLE_DATA_CONTRIBUTOR: string;
    /**
     * Read file share data via SMB.
     *
     * @remarks
     * SMB read access to Azure Files.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Read file content via SMB
     * - List files and directories
     * - Read file metadata
     *
     * **Common Use Cases**:
     * - File sharing scenarios
     * - Legacy application access
     * - Mounted file shares
     *
     * **Role GUID**: `aba4ae5f-2193-4029-9191-0cb91df5e314`
     */
    static readonly STORAGE_FILE_DATA_SMB_SHARE_READER: string;
    /**
     * Read and write file share data via SMB.
     *
     * @remarks
     * SMB read/write access to Azure Files.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - All STORAGE_FILE_DATA_SMB_SHARE_READER permissions
     * - Write file content
     * - Create and delete files and directories
     * - Modify file metadata
     *
     * **Common Use Cases**:
     * - File sharing with write access
     * - Application file storage
     * - User home directories
     *
     * **Role GUID**: `0c867c2a-1d8c-454a-a3db-ab2ea1bdc8bb`
     */
    static readonly STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR: string;
    /**
     * Full control of file share data including ACLs.
     *
     * @remarks
     * Highest level of file share access including permissions management.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - All STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR permissions
     * - Change file and directory ACLs
     * - Take ownership of files
     *
     * **Common Use Cases**:
     * - File server administrators
     * - Permission management tools
     * - Advanced file sharing scenarios
     *
     * **Role GUID**: `a7264617-510b-434b-a828-9731dc254ea7`
     */
    static readonly STORAGE_FILE_DATA_SMB_SHARE_ELEVATED_CONTRIBUTOR: string;
    /**
     * Read Cosmos DB account metadata.
     *
     * @remarks
     * View account properties without data access.
     *
     * **Permissions**:
     * - Read account properties
     * - List database accounts
     * - View account metrics
     *
     * **Common Use Cases**:
     * - Monitoring systems
     * - Configuration readers
     * - Cost analysis
     *
     * **Role GUID**: `fbdf93bf-df7d-467e-a4d2-9458aa1360c8`
     */
    static readonly COSMOS_DB_ACCOUNT_READER: string;
    /**
     * Manage Cosmos DB accounts but not access data.
     *
     * @remarks
     * Control plane operations without data plane access.
     *
     * **Permissions**:
     * - All COSMOS_DB_ACCOUNT_READER permissions
     * - Failover accounts
     * - Regenerate keys
     * - Manage throughput
     *
     * **Common Use Cases**:
     * - Database administrators
     * - Operations teams
     * - Disaster recovery management
     *
     * **Role GUID**: `230815da-be43-4aae-9cb4-875f7bd000aa`
     */
    static readonly COSMOS_DB_OPERATOR: string;
    /**
     * Read Cosmos DB data (SQL API).
     *
     * @remarks
     * Data plane read access for SQL API.
     *
     * **Permissions**:
     * - Read documents
     * - Query containers
     * - Read stored procedures, triggers, UDFs
     *
     * **Common Use Cases**:
     * - Read-only applications
     * - Reporting tools
     * - Data analysis
     *
     * **Role GUID**: `00000000-0000-0000-0000-000000000001`
     */
    static readonly COSMOS_DB_DATA_READER: string;
    /**
     * Read and write Cosmos DB data (SQL API).
     *
     * @remarks
     * Full data plane access for SQL API.
     *
     * **Permissions**:
     * - All COSMOS_DB_DATA_READER permissions
     * - Create, update, delete documents
     * - Execute stored procedures
     *
     * **Common Use Cases**:
     * - Application data access
     * - Data migration tools
     * - CRUD operations
     *
     * **Role GUID**: `00000000-0000-0000-0000-000000000002`
     */
    static readonly COSMOS_DB_DATA_CONTRIBUTOR: string;
    /**
     * Read secrets from Key Vault.
     *
     * @remarks
     * Read-only access to secret values.
     * Uses Azure RBAC data plane permissions.
     *
     * **Permissions**:
     * - Read secret values
     * - List secrets
     * - Read secret metadata
     *
     * **Common Use Cases**:
     * - Applications reading configuration
     * - Services accessing credentials
     * - Automated processes
     *
     * **Role GUID**: `4633458b-17de-408a-b874-0445c86b69e6`
     */
    static readonly KEY_VAULT_SECRETS_USER: string;
    /**
     * Manage secrets in Key Vault.
     *
     * @remarks
     * Full secret management permissions.
     *
     * **Permissions**:
     * - All KEY_VAULT_SECRETS_USER permissions
     * - Create and update secrets
     * - Delete secrets
     * - Manage secret versions
     *
     * **Common Use Cases**:
     * - Secret rotation systems
     * - DevOps tools
     * - Administrative tasks
     *
     * **Role GUID**: `b86a8fe4-44ce-4948-aee5-eccb2c155cd7`
     */
    static readonly KEY_VAULT_SECRETS_OFFICER: string;
    /**
     * Use cryptographic keys for operations.
     *
     * @remarks
     * Permission to perform cryptographic operations with keys.
     *
     * **Permissions**:
     * - Encrypt data
     * - Decrypt data
     * - Sign data
     * - Verify signatures
     * - Wrap keys
     * - Unwrap keys
     *
     * **Common Use Cases**:
     * - Encryption services
     * - Digital signature systems
     * - Key wrapping scenarios
     *
     * **Role GUID**: `12338af0-0e69-4776-bea7-57ae8d297424`
     */
    static readonly KEY_VAULT_CRYPTO_USER: string;
    /**
     * Manage cryptographic keys.
     *
     * @remarks
     * Full key management permissions.
     *
     * **Permissions**:
     * - All KEY_VAULT_CRYPTO_USER permissions
     * - Create keys
     * - Import keys
     * - Delete keys
     * - Manage key versions
     * - Rotate keys
     *
     * **Common Use Cases**:
     * - Key administrators
     * - Cryptographic infrastructure management
     * - Key lifecycle management
     *
     * **Role GUID**: `14b46e9e-c2b7-41b4-b07b-48a6ebf60603`
     */
    static readonly KEY_VAULT_CRYPTO_OFFICER: string;
    /**
     * Read certificates.
     *
     * @remarks
     * Read-only access to certificates.
     *
     * **Permissions**:
     * - Read certificate data
     * - List certificates
     * - Read certificate metadata
     *
     * **Common Use Cases**:
     * - Certificate validation
     * - Monitoring and alerts
     * - Compliance scanning
     *
     * **Role GUID**: `db79e9a7-68ee-4b58-9aeb-b90e7c24fcba`
     */
    static readonly KEY_VAULT_CERTIFICATES_USER: string;
    /**
     * Manage certificates.
     *
     * @remarks
     * Full certificate management.
     *
     * **Permissions**:
     * - All KEY_VAULT_CERTIFICATES_USER permissions
     * - Create certificates
     * - Import certificates
     * - Delete certificates
     * - Manage certificate policies
     *
     * **Common Use Cases**:
     * - Certificate administrators
     * - Automated certificate management
     * - Certificate lifecycle management
     *
     * **Role GUID**: `a4417e6f-fecd-4de8-b567-7b0420556985`
     */
    static readonly KEY_VAULT_CERTIFICATES_OFFICER: string;
    /**
     * Read all Key Vault data.
     *
     * @remarks
     * Read access to all Key Vault objects.
     *
     * **Permissions**:
     * - Read secrets, keys, and certificates
     * - List all objects
     * - Read metadata
     *
     * **Common Use Cases**:
     * - Auditing and compliance
     * - Backup systems
     * - Read-only monitoring
     *
     * **Role GUID**: `21090545-7ca7-4776-b22c-e363652d74d2`
     */
    static readonly KEY_VAULT_READER: string;
    /**
     * Full access to Key Vault data.
     *
     * @remarks
     * Administrative access to all Key Vault objects.
     *
     * **Permissions**:
     * - All read permissions
     * - Create, update, delete secrets, keys, and certificates
     * - Manage access policies (when using RBAC)
     *
     * **Common Use Cases**:
     * - Key Vault administrators
     * - Full management scenarios
     * - Migration and setup
     *
     * **Role GUID**: `00482a5a-887f-4fb3-b363-3b7fe8e74483`
     */
    static readonly KEY_VAULT_ADMINISTRATOR: string;
    /**
     * Deploy and manage web apps.
     *
     * @remarks
     * Full management of App Service resources.
     *
     * **Permissions**:
     * - Create and delete web apps
     * - Configure app settings
     * - Deploy code
     * - Manage deployment slots
     *
     * **Common Use Cases**:
     * - DevOps pipelines
     * - Application deployments
     * - App Service management
     *
     * **Role GUID**: `de139f84-1756-47ae-9be6-808fbbe84772`
     */
    static readonly WEBSITE_CONTRIBUTOR: string;
    /**
     * Manage App Service plans.
     *
     * @remarks
     * Control App Service plan configurations.
     *
     * **Permissions**:
     * - Create and delete App Service plans
     * - Scale plans
     * - Configure plan settings
     *
     * **Common Use Cases**:
     * - Infrastructure management
     * - Capacity planning
     * - Cost optimization
     *
     * **Role GUID**: `2cc479cb-7b4d-49a8-b449-8c00fd0f0a4b`
     */
    static readonly WEB_PLAN_CONTRIBUTOR: string;
    /**
     * Manage SQL databases.
     *
     * @remarks
     * Full management of SQL databases except server-level operations.
     *
     * **Permissions**:
     * - Create and delete databases
     * - Configure database settings
     * - Manage backups
     * - Scale databases
     *
     * **Common Use Cases**:
     * - Database administrators
     * - Automated database management
     * - DevOps workflows
     *
     * **Role GUID**: `9b7fa17d-e63e-47b0-bb0a-15c516ac86ec`
     */
    static readonly SQL_DB_CONTRIBUTOR: string;
    /**
     * Manage SQL database security.
     *
     * @remarks
     * Security management for SQL databases.
     *
     * **Permissions**:
     * - Manage security policies
     * - Configure auditing
     * - Manage threat detection
     * - View security alerts
     *
     * **Common Use Cases**:
     * - Security administrators
     * - Compliance management
     * - Security monitoring
     *
     * **Role GUID**: `056cd41c-7e88-42e1-933e-88ba6a50c9c3`
     */
    static readonly SQL_SECURITY_MANAGER: string;
    /**
     * Manage SQL servers.
     *
     * @remarks
     * Server-level management for SQL.
     *
     * **Permissions**:
     * - Create and delete SQL servers
     * - Configure server settings
     * - Manage server firewall rules
     * - All SQL_DB_CONTRIBUTOR permissions
     *
     * **Common Use Cases**:
     * - SQL server administrators
     * - Infrastructure provisioning
     * - Server configuration management
     *
     * **Role GUID**: `6d8ee4ec-f05a-4a1d-8b00-a9b17e38b437`
     */
    static readonly SQL_SERVER_CONTRIBUTOR: string;
    /**
     * Read Event Hub data.
     *
     * @remarks
     * Receive events from Event Hubs.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Receive events
     * - Read event hub metadata
     * - Manage consumer groups
     *
     * **Common Use Cases**:
     * - Event consumers
     * - Stream processing applications
     * - Analytics pipelines
     *
     * **Role GUID**: `a638d3c7-ab3a-418d-83e6-5f17a39d4fde`
     */
    static readonly EVENT_HUB_DATA_RECEIVER: string;
    /**
     * Send Event Hub data.
     *
     * @remarks
     * Send events to Event Hubs.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Send events
     * - Read event hub metadata
     *
     * **Common Use Cases**:
     * - Event producers
     * - Logging and telemetry systems
     * - IoT devices
     *
     * **Role GUID**: `2b629674-e913-4c01-ae53-ef4638d8f975`
     */
    static readonly EVENT_HUB_DATA_SENDER: string;
    /**
     * Manage Event Hubs.
     *
     * @remarks
     * Full Event Hub management and data access.
     *
     * **Permissions**:
     * - All EVENT_HUB_DATA_RECEIVER permissions
     * - All EVENT_HUB_DATA_SENDER permissions
     * - Manage event hubs
     * - Manage consumer groups
     *
     * **Common Use Cases**:
     * - Event Hub administrators
     * - Full-access applications
     * - Management tools
     *
     * **Role GUID**: `f526a384-b230-433a-b45c-95f59c4a2dec`
     */
    static readonly EVENT_HUB_DATA_OWNER: string;
    /**
     * Read Service Bus messages.
     *
     * @remarks
     * Receive messages from Service Bus queues and subscriptions.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Receive messages
     * - Complete messages
     * - Read entity metadata
     *
     * **Common Use Cases**:
     * - Message consumers
     * - Queue processors
     * - Subscription listeners
     *
     * **Role GUID**: `4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0`
     */
    static readonly SERVICE_BUS_DATA_RECEIVER: string;
    /**
     * Send Service Bus messages.
     *
     * @remarks
     * Send messages to Service Bus queues and topics.
     * Supports ABAC conditions.
     *
     * **Permissions**:
     * - Send messages
     * - Read entity metadata
     *
     * **Common Use Cases**:
     * - Message producers
     * - Event publishers
     * - Command senders
     *
     * **Role GUID**: `69a216fc-b8fb-44d8-bc22-1f3c2cd27a39`
     */
    static readonly SERVICE_BUS_DATA_SENDER: string;
    /**
     * Manage Service Bus entities.
     *
     * @remarks
     * Full Service Bus management and data access.
     *
     * **Permissions**:
     * - All SERVICE_BUS_DATA_RECEIVER permissions
     * - All SERVICE_BUS_DATA_SENDER permissions
     * - Manage queues, topics, and subscriptions
     * - Manage sessions
     *
     * **Common Use Cases**:
     * - Service Bus administrators
     * - Full-access applications
     * - Management automation
     *
     * **Role GUID**: `090c5cfd-751d-490a-894a-3ce6f1109419`
     */
    static readonly SERVICE_BUS_DATA_OWNER: string;
    /**
     * Manage API Management service and APIs.
     *
     * @remarks
     * Full management of API Management service including API definitions.
     *
     * **Permissions**:
     * - Manage API Management service configuration
     * - Create, update, delete APIs
     * - Manage policies
     * - Configure backends and products
     * - Manage subscriptions
     *
     * **Common Use Cases**:
     * - API administrators
     * - DevOps automation
     * - Full API lifecycle management
     *
     * **Role GUID**: `312a565d-c81f-4fd8-895a-4e21e48d571c`
     */
    static readonly API_MANAGEMENT_SERVICE_CONTRIBUTOR: string;
    /**
     * Manage API Management service but not APIs.
     *
     * @remarks
     * Service-level operations without API definition access.
     *
     * **Permissions**:
     * - Manage service configuration
     * - Scale service
     * - Configure networking
     * - Manage service certificates
     *
     * **Limitations**:
     * - Cannot create or modify APIs
     * - Cannot manage policies
     * - Cannot manage subscriptions
     *
     * **Common Use Cases**:
     * - Infrastructure operators
     * - Service scaling automation
     * - Network configuration management
     *
     * **Role GUID**: `e022efe7-f5ba-4159-bbe4-b44f577e9b61`
     */
    static readonly API_MANAGEMENT_SERVICE_OPERATOR: string;
    /**
     * Read API Management service and APIs.
     *
     * @remarks
     * Read-only access to API Management service and API definitions.
     *
     * **Permissions**:
     * - View service configuration
     * - View APIs and operations
     * - View policies
     * - View products and subscriptions
     *
     * **Common Use Cases**:
     * - Monitoring and auditing
     * - Documentation generation
     * - Read-only dashboards
     *
     * **Role GUID**: `71522526-b88f-4d52-b57f-d31fc3546d0d`
     */
    static readonly API_MANAGEMENT_SERVICE_READER: string;
    /**
     * Edit developer portal content.
     *
     * @remarks
     * Customize and publish developer portal content.
     *
     * **Permissions**:
     * - Edit portal content
     * - Customize portal appearance
     * - Publish portal changes
     *
     * **Common Use Cases**:
     * - Developer portal administrators
     * - Content managers
     * - Portal customization
     *
     * **Role GUID**: `c031e6a8-4391-4de0-8d69-4706a7ed3729`
     */
    static readonly API_MANAGEMENT_DEVELOPER_PORTAL_CONTENT_EDITOR: string;
    /**
     * Manage workspace-scoped resources in API Management.
     *
     * @remarks
     * Full access to resources within an API Management workspace.
     *
     * **Permissions**:
     * - Manage workspace APIs
     * - Manage workspace products
     * - Manage workspace backends
     * - Manage workspace policies
     *
     * **Common Use Cases**:
     * - Workspace administrators
     * - Team-scoped API management
     * - Multi-tenant scenarios
     *
     * **Role GUID**: `56328988-075d-4c6a-8766-d93edd6725b6`
     */
    static readonly API_MANAGEMENT_WORKSPACE_CONTRIBUTOR: string;
    /**
     * Pull container images.
     *
     * @remarks
     * Read-only access to pull images from Azure Container Registry.
     *
     * **Permissions**:
     * - Pull images
     * - Read manifests
     * - List repositories
     *
     * **Common Use Cases**:
     * - Kubernetes clusters
     * - Container deployment pipelines
     * - Container instances
     *
     * **Role GUID**: `7f951dda-4ed3-4680-a7ca-43fe172d538d`
     */
    static readonly ACR_PULL: string;
    /**
     * Push container images.
     *
     * @remarks
     * Push and pull images to/from Azure Container Registry.
     *
     * **Permissions**:
     * - All ACR_PULL permissions
     * - Push images
     * - Create repositories
     *
     * **Common Use Cases**:
     * - CI/CD pipelines
     * - Build agents
     * - Image publishing
     *
     * **Role GUID**: `8311e382-0749-4cb8-b61a-304f252e45ec`
     */
    static readonly ACR_PUSH: string;
    /**
     * Delete container images.
     *
     * @remarks
     * Delete images and repositories from Azure Container Registry.
     *
     * **Permissions**:
     * - Delete images
     * - Delete repositories
     * - Delete manifests
     *
     * **Common Use Cases**:
     * - Cleanup automation
     * - Image lifecycle management
     * - Repository management
     *
     * **Role GUID**: `c2f4ef07-c644-48eb-af81-4b1b4947fb11`
     */
    static readonly ACR_DELETE: string;
    /**
     * Helper to construct full role definition resource ID.
     *
     * @param guid - The role definition GUID
     * @returns ARM expression for the role definition resource ID
     *
     * @remarks
     * Generates an ARM template expression using the `subscriptionResourceId` function.
     * This ensures the role is looked up in the current subscription at deployment time.
     *
     * **ARM Expression Format**:
     * `[subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '{guid}')]`
     *
     * During deployment, this resolves to:
     * `/subscriptions/{subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/{guid}`
     *
     * @internal
     */
    private static roleId;
}
//# sourceMappingURL=well-known-role-ids.d.ts.map