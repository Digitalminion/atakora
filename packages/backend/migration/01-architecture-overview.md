# Migration Architecture Overview

## Vision
Transform the current monolithic FastAPI application into a modern, cloud-native architecture using:
- **Azure API Management (APIM)** for API gateway, security, and governance
- **Azure Functions** for serverless compute with queue-driven orchestration
- **Azure Service Bus** for asynchronous request-response pattern
- **Azure Cosmos DB** for state management and audit trail
- **Azure Blob Storage** for file uploads (future: Lab CSV, attachments)

## Core Architectural Principles

### 1. Async Request-Response Pattern
**Problem Solved**: Long-running LLM operations (5-30 seconds) cause HTTP timeouts and poor user experience.

**Solution**:
```
Client Request → APIM → Fast Accept Handler (< 500ms)
                          ↓
                    Service Bus Queue
                          ↓
                    Background Processor (30-120s)
                          ↓
                    Update Cosmos with Results
                          ↓
                    Client Polls Status or Receives SignalR Push
```

**Benefits**:
- Immediate response (202 Accepted)
- No timeout risk
- Better scalability (queue buffering)
- Fault tolerance (retry, dead-letter queues)

### 2. Separation of Concerns

#### API Gateway Layer (APIM)
**Responsibilities**:
- Authentication & authorization
- Rate limiting & throttling
- Request validation
- Response caching
- API versioning
- Monitoring & analytics

#### Accept Layer (HTTP Functions)
**Responsibilities**:
- Fast payload validation
- Write request to Cosmos
- Enqueue message to Service Bus
- Return request_id immediately

#### Processing Layer (Queue Functions)
**Responsibilities**:
- Long-running business logic
- LLM calls & orchestration
- Complex transformations
- Update Cosmos with results

#### Simple CRUD Layer (HTTP Functions)
**Responsibilities**:
- Direct Cosmos read/write
- No complex processing
- < 500ms response time

### 3. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure API Management                      │
│  • Authentication (OAuth 2.0, API keys)                     │
│  • Rate limiting (per user, per minute)                     │
│  • Response caching (GET endpoints)                         │
│  • Request/response logging                                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► GET /status/{id} ──► Status Function ──► Cosmos DB
             │
             ├─► POST /finalized ──► Finalize Function ──► Cosmos DB
             │
             ├─► POST /view-history ──► History Function ──► Cosmos DB
             │
             ├─► POST /feedback ──► Feedback Function ──► Cosmos DB
             │
             ├─► POST /upload-lab-data ──► Upload Function ──► Blob Storage
             │                                                      ↓
             │                                              Cosmos (metadata)
             │
             └─► POST /search ──► Request Accept Function
                                          ↓
                                  Write to Cosmos
                                  (status=queued)
                                          ↓
                                  Service Bus Queue
                                  {"request_id": "..."}
                                          ↓
                          ┌───────────────────────────┐
                          │ Search Orchestrator       │
                          │ (Durable Functions)       │
                          │                           │
                          │ 1. Synonym Generation     │
                          │ 2. DeltaE Filtering       │
                          │ 3. Parallel Searches (4x) │
                          │ 4. Deduplication          │
                          │ 5. LLM Scoring (5x)       │
                          │ 6. Overall Analysis       │
                          │ 7. Flag Computation       │
                          │ 8. Lab Diff Computation   │
                          └─────────┬─────────────────┘
                                    ↓
                            Update Cosmos DB
                            (status=completed, results={...})
                                    ↓
                            Optional: SignalR Push
                            (notify client of completion)
```

## Component Breakdown

### 1. Azure API Management (APIM)

#### Configuration
```xml
<policies>
    <inbound>
        <!-- Authentication -->
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
            <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration" />
            <audiences>
                <audience>api://color-ai</audience>
            </audiences>
        </validate-jwt>

        <!-- Rate Limiting -->
        <rate-limit-by-key calls="100" renewal-period="60"
                           counter-key="@(context.Request.Headers.GetValueOrDefault("user-id","anonymous"))" />

        <!-- Request Validation -->
        <validate-content unspecified-content-type-action="prevent"
                         max-size="1024"
                         size-limit-exceeded-action="prevent" />

        <!-- Logging -->
        <log-to-eventhub logger-id="color-ai-logger">
            @{
                return new JObject(
                    new JProperty("request_id", context.RequestId),
                    new JProperty("user_id", context.Request.Headers.GetValueOrDefault("user-id","")),
                    new JProperty("method", context.Request.Method),
                    new JProperty("url", context.Request.Url.ToString())
                ).ToString();
            }
        </log-to-eventhub>
    </inbound>

    <outbound>
        <!-- Caching for GET endpoints -->
        <cache-store duration="300" />

        <!-- CORS -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://colorai.avient.com</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
            </allowed-methods>
        </cors>
    </outbound>
</policies>
```

#### Named Values
```
KEY_VAULT_URL = https://colorai-kv.vault.azure.net/
FUNCTION_APP_URL = https://colorai-functions.azurewebsites.net
COSMOS_ENDPOINT = https://colorai-cosmos.documents.azure.com
```

### 2. Cosmos DB Containers

#### Container: `search-requests`
**Purpose**: Store all search requests and results

**Partition Key**: `/request_id`

**Schema**:
```json
{
  "id": "req_550e8400-e29b-41d4-a716-446655440000",
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "john.doe@avient.com",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:20:45.678Z",
  "status": "completed",
  "request_payload": {
    "REQUEST_RESIN_FINAL": "PP",
    "REQUEST_COLOR_DESCR": "blue",
    "L": 45.5,
    "a": 12.3,
    "b": -25.7,
    "k": 20
  },
  "processing_metadata": {
    "started_at": "2025-10-10T14:20:02.000Z",
    "synonym_resins": ["Polypropylene - Homopolymer", "PP-H", "PP-C"],
    "deltae_filter_applied": true,
    "deltae_matches_count": 127,
    "searches_executed": 4,
    "total_results_before_dedup": 45,
    "total_results_after_dedup": 38,
    "llm_scoring_duration_ms": 8423
  },
  "results": {
    "overall_scoring_analysis": {...},
    "search_results": [...]
  },
  "error": null,
  "ttl": 2592000
}
```

**Status Values**:
- `queued`: Request written, not yet processing
- `processing`: Orchestrator started
- `scoring`: LLM scoring in progress
- `completed`: Successfully completed with results
- `failed`: Processing failed (see error field)

**TTL**: 30 days (2592000 seconds) - auto-delete old requests

#### Container: `audit-trail`
**Purpose**: Finalized selections and user history

**Partition Key**: `/session_id`

**Schema**: Same as current (from `/finalized` endpoint)

#### Container: `feedback`
**Purpose**: User feedback with AI summaries

**Partition Key**: `/session_id`

**Schema**: Same as current (from `/feedback` endpoint)

#### Container: `lab-data-registry`
**Purpose**: Track uploaded Lab data files

**Partition Key**: `/upload_id`

**Schema**:
```json
{
  "id": "upload_20251010_142000",
  "upload_id": "upload_20251010_142000",
  "blob_url": "https://colorai.blob.core.windows.net/lab-data/MTL_Lab_20251010.csv",
  "blob_name": "MTL_Lab_20251010.csv",
  "uploaded_by": "admin@avient.com",
  "uploaded_at": "2025-10-10T14:20:00.000Z",
  "file_size_bytes": 11534000,
  "row_count": 5432,
  "status": "active",
  "validation": {
    "columns_found": ["Material", "L*", "a*", "b*"],
    "missing_columns": [],
    "null_values_count": 0,
    "duplicate_materials_count": 0
  },
  "ttl": -1
}
```

### 3. Service Bus Queues

#### Queue: `search-requests`
**Purpose**: Trigger search orchestration

**Configuration**:
- Max delivery count: 3
- Lock duration: 10 minutes
- TTL: 1 hour
- Dead-letter on max delivery
- Duplicate detection: 5 minutes

**Message Schema**:
```json
{
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "priority": "normal"
}
```

**Message Properties** (for filtering):
- `user_id`: String
- `rerank`: Boolean
- `has_lab`: Boolean

### 4. Blob Storage Containers

#### Container: `lab-data`
**Purpose**: Store Lab CSV files

**Configuration**:
- Access tier: Hot
- Public access: None (private)
- Lifecycle: Delete after 365 days

**Naming Convention**: `MTL_Lab_{timestamp}.csv`

#### Container: `feedback-attachments` (Future)
**Purpose**: Store user-uploaded screenshots/files

**Naming Convention**: `{session_id}/{timestamp}_{filename}`

### 5. Azure Functions Architecture

#### Function App: `colorai-functions`
**Runtime**: Python 3.11
**Plan**: Premium EP1 (always warm, no cold start)
**Region**: Same as Cosmos DB

**Application Settings**:
```
KEY_VAULT_URL = https://colorai-kv.vault.azure.net/
COSMOS_ENDPOINT = ${@Microsoft.KeyVault(SecretUri=...)}
SERVICE_BUS_CONNECTION = ${@Microsoft.KeyVault(SecretUri=...)}
OPENAI_ENDPOINT = ${@Microsoft.KeyVault(SecretUri=...)}
OPENAI_API_KEY = ${@Microsoft.KeyVault(SecretUri=...)}
SEARCH_ENDPOINT = ${@Microsoft.KeyVault(SecretUri=...)}
SEARCH_API_KEY = ${@Microsoft.KeyVault(SecretUri=...)}
BLOB_CONNECTION = ${@Microsoft.KeyVault(SecretUri=...)}
```

## Migration Sequence

### Phase 1: Foundation (Week 1-2)
1. Provision Azure resources (APIM, Functions, Service Bus, Blob)
2. Configure APIM policies
3. Set up Cosmos DB containers with indexes
4. Deploy simple HTTP functions (finalized, view-history, feedback, status)
5. Test synchronous endpoints

### Phase 2: Async Search - Basic (Week 3-4)
1. Deploy request accept function
2. Deploy basic search orchestrator (single function, inline logic)
3. Test end-to-end async flow
4. Implement status polling
5. Migrate synonym generation

### Phase 3: Async Search - Advanced (Week 5-6)
1. Refactor to Durable Functions orchestrator
2. Implement parallel activities (searches, scoring)
3. Add enrichments (flags, Lab diffs)
4. Optimize chunking and batching
5. Add comprehensive error handling

### Phase 4: File Upload & DeltaE Service (Week 7)
1. Implement Lab data upload endpoint
2. Deploy DeltaE service function (Premium plan, warm)
3. Blob storage integration
4. CSV validation and parsing

### Phase 5: Monitoring & Optimization (Week 8)
1. Configure Application Insights
2. Set up dashboards and alerts
3. Load testing
4. Performance tuning
5. Documentation

### Phase 6: Cutover (Week 9)
1. Blue-green deployment
2. Traffic shifting (10% → 50% → 100%)
3. Monitor metrics
4. Rollback plan if needed

## Cost Estimation

### Current Architecture (FastAPI on App Service)
- **App Service**: Standard S1 (~$70/month)
- **Cosmos DB**: 1000 RU/s (~$60/month)
- **Azure OpenAI**: Pay-per-token (~$200/month)
- **Azure AI Search**: Basic tier (~$75/month)
- **Total**: ~$405/month

### New Architecture
- **APIM**: Consumption tier (~$3.50/million calls, ~$50/month)
- **Azure Functions**: Premium EP1 (~$150/month)
- **Service Bus**: Standard tier (~$10/month)
- **Blob Storage**: Hot tier (~$5/month)
- **Cosmos DB**: 1000 RU/s (~$60/month, same)
- **Azure OpenAI**: Same (~$200/month)
- **Azure AI Search**: Same (~$75/month)
- **Application Insights**: ~$20/month
- **Total**: ~$570/month

**Increase**: ~$165/month (~40% more)

**Justification**:
- Better scalability (handle 10x traffic without changes)
- Better reliability (retry, dead-letter, fault isolation)
- Better monitoring (detailed telemetry)
- Better security (APIM gateway)
- Faster response times (async pattern)

### Cost Optimization Options
1. **Functions Consumption Plan** for simple endpoints: Save $100/month
   - Keep Premium only for search orchestrator
2. **APIM Developer tier** (if testing): $50/month fixed
3. **Cosmos DB Autoscale**: Only pay for actual usage (could save 50%)
4. **Reserved Capacity**: 1-year commit saves 20-40%

## Rollback Strategy

### Scenario: Critical Bug in New Architecture
1. **Detection**: Alert fires, error rate > 5%
2. **Traffic Switch**: APIM policy redirects to old FastAPI endpoint (within 5 minutes)
3. **Root Cause Analysis**: Investigate logs in Application Insights
4. **Fix Forward or Rollback**: Deploy hotfix or revert to previous deployment

### Canary Deployment
```xml
<!-- APIM Policy for gradual rollout -->
<choose>
    <when condition="@(new Random().Next(100) < 10)">
        <!-- 10% traffic to new architecture -->
        <set-backend-service base-url="https://colorai-functions.azurewebsites.net" />
    </when>
    <otherwise>
        <!-- 90% traffic to old FastAPI -->
        <set-backend-service base-url="https://colorai-legacy.azurewebsites.net" />
    </otherwise>
</choose>
```

### Rollback Checklist
- [ ] APIM policy updated to route 100% to old endpoint
- [ ] Confirm error rate returns to baseline
- [ ] Notify users of temporary issue (if user-facing)
- [ ] Preserve new architecture in staging for debugging
- [ ] Schedule post-mortem meeting

## Monitoring & Alerts

### Key Metrics
1. **Request Accept Latency**: < 500ms (p95)
2. **Search Orchestration Duration**: < 30s (p95)
3. **Queue Depth**: < 100 messages
4. **Error Rate**: < 1%
5. **Cosmos RU Consumption**: < 80% of provisioned

### Alerts
1. **High Error Rate**: > 5% for 5 minutes → Page on-call
2. **High Latency**: Accept > 1s for 5 minutes → Email team
3. **Queue Backlog**: > 500 messages → Email team
4. **Cosmos Throttling**: 429 responses > 10/minute → Auto-scale trigger
5. **Function Failures**: > 10 failures in 5 minutes → Page on-call

### Dashboards
**Application Insights Workbook**: Real-time operational dashboard
- Request volume (RPM)
- P50/P95/P99 latencies
- Error rate and top errors
- Queue depth over time
- Cosmos RU consumption
- Function execution count and duration

## Security Considerations

### Authentication & Authorization
- **APIM**: OAuth 2.0 (Azure AD) or API key
- **Functions**: Managed Identity to access Cosmos/Blob/KeyVault
- **Cosmos DB**: RBAC (Functions have Data Contributor role)
- **Key Vault**: RBAC (Functions have Secrets User role)

### Data Protection
- **In Transit**: HTTPS only (TLS 1.2+)
- **At Rest**: Cosmos DB encryption enabled
- **Blob Storage**: Encryption enabled
- **Secrets**: Never in code, always in Key Vault

### Network Security
- **APIM**: Public endpoint with WAF (optional)
- **Functions**: VNet integration (optional, for private Cosmos access)
- **Cosmos DB**: Firewall rules (allow APIM + Functions IPs)
- **Blob Storage**: Firewall rules (allow Functions IP)

### Compliance
- **Audit Logging**: All API calls logged to Azure Monitor
- **Data Retention**: TTL on Cosmos containers (30 days for search requests)
- **PII Handling**: User names/emails encrypted if required
- **GDPR**: User data deletion endpoint (future enhancement)

## Next Steps
See individual endpoint migration documents:
- [02-search-endpoint-migration.md](./02-search-endpoint-migration.md)
- [03-simple-endpoints-migration.md](./03-simple-endpoints-migration.md)
- [04-file-upload-pattern.md](./04-file-upload-pattern.md)
- [05-durable-functions-orchestration.md](./05-durable-functions-orchestration.md)
