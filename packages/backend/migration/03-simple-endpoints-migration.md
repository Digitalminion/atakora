# Simple Endpoints Migration

## Overview
Migrate the simple, synchronous endpoints (`/finalized`, `/view-history`, `/feedback`) to lightweight HTTP-triggered Azure Functions. These endpoints remain synchronous as they are fast (< 500ms) with no complex orchestration.

## Endpoints to Migrate
1. **POST /finalized** - Update material selection
2. **POST /view-history** - Query search history
3. **POST /feedback** - Submit user feedback

---

## 1. Finalized Endpoint Migration

### Current Behavior
- Updates Cosmos audit record with selected material_id and status
- Read-modify-write pattern
- Response time: 50-200ms

### Migrated Function

#### Function Code
```python
import azure.functions as func
import json
from datetime import datetime, timezone
from azure.cosmos import CosmosClient

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Update audit record with finalized material selection.
    """
    try:
        # Parse payload
        payload = req.get_json()

        # Validate required fields
        if 'session_id' not in payload:
            return func.HttpResponse(
                json.dumps({"error": "session_id required"}),
                status_code=400,
                mimetype='application/json'
            )

        session_id = payload['session_id']
        material_id = payload.get('material_id')
        status = payload.get('status', 'done')
        request_id = payload.get('request_id')

        # Validate status
        if status not in ['done', 'pending', 'cancelled']:
            return func.HttpResponse(
                json.dumps({"error": "Invalid status. Allowed: done, pending, cancelled"}),
                status_code=400,
                mimetype='application/json'
            )

        # Get Cosmos container
        container = cosmos_client.get_database_client("colorai").get_container_client("audit-trail")

        # Read existing document
        try:
            doc = container.read_item(item=session_id, partition_key=session_id)
        except:
            # Create minimal document if not exists
            doc = {
                "id": session_id,
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "user_name": "",
                "original_payload": {}
            }

        # Update fields
        if material_id is not None:
            doc['material_id'] = material_id
        if request_id is not None:
            doc['request_id'] = request_id

        doc['status'] = status
        doc['updated_at'] = datetime.now(timezone.utc).isoformat()

        # Upsert document
        updated_doc = container.upsert_item(doc)

        # Build response
        response = {
            "ok": True,
            "session_id": updated_doc.get('session_id', session_id),
            "status": updated_doc.get('status', status),
            "material_id": updated_doc.get('material_id'),
            "updated_at": updated_doc.get('updated_at')
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype='application/json'
        )

    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON payload"}),
            status_code=400,
            mimetype='application/json'
        )
    except Exception as e:
        logging.error(f"Finalize failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Failed to update audit record"}),
            status_code=500,
            mimetype='application/json'
        )
```

#### Bindings (function.json)
```json
{
  "scriptFile": "finalized.py",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "finalized"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

#### APIM Policy
```xml
<policies>
  <inbound>
    <base />
    <!-- Validate session_id format (UUID) -->
    <set-variable name="session_id" value="@(context.Request.Body.As<JObject>()["session_id"]?.ToString())" />
    <choose>
      <when condition="@(string.IsNullOrEmpty(context.Variables.GetValueOrDefault<string>("session_id")))">
        <return-response>
          <set-status code="400" reason="Bad Request" />
          <set-body>{"error": "session_id required"}</set-body>
        </return-response>
      </when>
    </choose>
  </inbound>
</policies>
```

### Testing
```bash
# Success case
curl -X POST https://api.colorai.com/finalized \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "material_id": "MAT12345",
    "status": "done"
  }'

# Expected: 200 OK with updated document

# Cancelled case
curl -X POST https://api.colorai.com/finalized \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled"
  }'

# Expected: 200 OK with status=cancelled, material_id=null
```

---

## 2. View History Endpoint Migration

### Current Behavior
- Queries Cosmos DB with filters (user, session, status, dates)
- Server-side field projection
- Cross-partition query
- Response time: 100-500ms

### Migrated Function

#### Function Code
```python
import azure.functions as func
import json
from azure.cosmos import CosmosClient

# Field whitelist
DEFAULT_FIELDS = ["created_at", "updated_at", "user_name", "session_id", "request_id", "material_id", "status"]
ALLOWED_FIELDS = set(DEFAULT_FIELDS + ["original_payload", "id"])

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Query search history with flexible filters and field projection.
    """
    try:
        # Parse payload
        params = req.get_json()

        # Validate fields
        requested_fields = params.get('fields', DEFAULT_FIELDS)
        invalid_fields = [f for f in requested_fields if f not in ALLOWED_FIELDS]
        if invalid_fields:
            return func.HttpResponse(
                json.dumps({"error": f"Invalid fields: {invalid_fields}"}),
                status_code=400,
                mimetype='application/json'
            )

        # Build SELECT clause
        select_list = ", ".join([f"c.{f}" for f in requested_fields])

        # Build WHERE clause
        where_clauses = []
        parameters = []

        if params.get('user_name'):
            where_clauses.append("c.user_name = @user_name")
            parameters.append({"name": "@user_name", "value": params['user_name']})

        if params.get('session_id'):
            where_clauses.append("c.session_id = @session_id")
            parameters.append({"name": "@session_id", "value": params['session_id']})

        if params.get('status'):
            where_clauses.append("c.status = @status")
            parameters.append({"name": "@status", "value": params['status']})

        if params.get('date_from'):
            where_clauses.append("c.updated_at >= @date_from")
            parameters.append({"name": "@date_from", "value": params['date_from']})

        if params.get('date_to'):
            where_clauses.append("c.updated_at <= @date_to")
            parameters.append({"name": "@date_to", "value": params['date_to']})

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Build ORDER BY
        order = "DESC" if params.get('order', 'desc').lower() == 'desc' else "ASC"

        # Build SQL
        limit = min(int(params.get('limit', 100)), 1000)
        sql = f"""
        SELECT TOP @limit {select_list}
        FROM c
        {where_sql}
        ORDER BY c.updated_at {order}
        """.strip()

        parameters.append({"name": "@limit", "value": limit})

        # Execute query
        container = cosmos_client.get_database_client("colorai").get_container_client("audit-trail")
        items = list(container.query_items(
            query=sql,
            parameters=parameters,
            enable_cross_partition_query=True
        ))

        # Build response
        response = {
            "items": items,
            "count": len(items)
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype='application/json'
        )

    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON payload"}),
            status_code=400,
            mimetype='application/json'
        )
    except Exception as e:
        logging.error(f"View history failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Failed to query history"}),
            status_code=500,
            mimetype='application/json'
        )
```

#### Bindings (function.json)
```json
{
  "scriptFile": "view_history.py",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "view-history"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

#### APIM Policy (Caching)
```xml
<policies>
  <inbound>
    <base />
    <!-- Cache GET requests for 60 seconds -->
    <cache-lookup vary-by-developer="false" vary-by-developer-groups="false">
      <vary-by-query-parameter>user_name</vary-by-query-parameter>
      <vary-by-query-parameter>status</vary-by-query-parameter>
      <vary-by-query-parameter>limit</vary-by-query-parameter>
    </cache-lookup>
  </inbound>
  <outbound>
    <cache-store duration="60" />
    <base />
  </outbound>
</policies>
```

### Testing
```bash
# User's recent searches
curl -X POST https://api.colorai.com/view-history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "user_name": "john.doe@avient.com",
    "limit": 10,
    "order": "desc"
  }'

# Completed searches in date range
curl -X POST https://api.colorai.com/view-history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "done",
    "date_from": "2025-09-01T00:00:00Z",
    "date_to": "2025-09-30T23:59:59Z",
    "limit": 100
  }'
```

---

## 3. Feedback Endpoint Migration

### Current Behavior
- Stores feedback in Cosmos with status="pending"
- External Fabric process generates summary
- Response time: 50-150ms

### Migrated Function

#### Function Code
```python
import azure.functions as func
import json
import uuid
from datetime import datetime, timezone
from azure.cosmos import CosmosClient

MAX_FEEDBACK_LENGTH = 8000

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Accept user feedback for async summarization by Fabric.
    """
    try:
        # Parse payload
        payload = req.get_json()

        # Validate required fields
        if 'session_id' not in payload or 'feedback' not in payload:
            return func.HttpResponse(
                json.dumps({"error": "session_id and feedback required"}),
                status_code=400,
                mimetype='application/json'
            )

        feedback_text = payload['feedback']

        # Validate feedback length
        if not feedback_text or len(feedback_text) > MAX_FEEDBACK_LENGTH:
            return func.HttpResponse(
                json.dumps({"error": f"Feedback must be non-empty and <= {MAX_FEEDBACK_LENGTH} chars"}),
                status_code=413,
                mimetype='application/json'
            )

        # Extract fields
        session_id = payload['session_id']
        category = (payload.get('category') or "").strip() or None
        user_name = (payload.get('user_name') or req.headers.get('user-id', "")).strip() or None
        idempotency_key = (payload.get('idempotency_key') or str(uuid.uuid4())).strip()

        # Build document
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": idempotency_key,
            "session_id": session_id,
            "created_date": now,
            "user_name": user_name,
            "category": category,
            "feedback": feedback_text,
            "summary_status": "pending",
            "summary": ""
        }

        # Write to Cosmos (upsert for idempotency)
        container = cosmos_client.get_database_client("colorai").get_container_client("feedback")
        created = container.upsert_item(doc)

        # Build response
        response = {
            "id": created['id'],
            "session_id": created['session_id'],
            "created_date": created['created_date'],
            "user_name": created.get('user_name'),
            "category": created.get('category'),
            "feedback": created['feedback'],
            "summary_status": created['summary_status'],
            "summary": created.get('summary', '')
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=202,  # Accepted (async processing)
            mimetype='application/json'
        )

    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON payload"}),
            status_code=400,
            mimetype='application/json'
        )
    except Exception as e:
        logging.error(f"Feedback creation failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Failed to store feedback"}),
            status_code=500,
            mimetype='application/json'
        )
```

#### Bindings (function.json)
```json
{
  "scriptFile": "feedback.py",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "feedback"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

#### APIM Policy (Rate Limiting)
```xml
<policies>
  <inbound>
    <base />
    <!-- Prevent feedback spam: 5 per hour per user -->
    <rate-limit-by-key calls="5" renewal-period="3600"
                       counter-key="@(context.Request.Headers.GetValueOrDefault("user-id","anonymous") + "-feedback")" />
  </inbound>
</policies>
```

### Testing
```bash
# Submit feedback
curl -X POST https://api.colorai.com/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "user-id: john.doe@avient.com" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "feedback": "Search results were excellent!",
    "category": "Positive",
    "idempotency_key": "feedback_john_20251010_001"
  }'

# Expected: 202 Accepted with document ID

# Retry with same idempotency_key (should succeed, idempotent)
```

---

## Shared Infrastructure

### Cosmos DB Bindings
All functions use managed identity to access Cosmos DB:

```json
// host.json
{
  "version": "2.0",
  "extensions": {
    "cosmosDB": {
      "connectionMode": "Gateway",
      "protocol": "Https"
    }
  },
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  }
}
```

### Application Settings
```
COSMOS_ENDPOINT = ${@Microsoft.KeyVault(SecretUri=https://colorai-kv.vault.azure.net/secrets/cosmos-endpoint)}
COSMOS_KEY = ${@Microsoft.KeyVault(SecretUri=https://colorai-kv.vault.azure.net/secrets/cosmos-key)}
KEY_VAULT_URL = https://colorai-kv.vault.azure.net/
APPLICATIONINSIGHTS_CONNECTION_STRING = ${@Microsoft.KeyVault(...)}
```

### Managed Identity Configuration
```bash
# Assign managed identity to function app
az functionapp identity assign \
  --name colorai-functions \
  --resource-group colorai-rg

# Grant Cosmos DB access
az cosmosdb sql role assignment create \
  --account-name colorai-cosmos \
  --resource-group colorai-rg \
  --scope "/" \
  --principal-id <managed-identity-principal-id> \
  --role-definition-id 00000000-0000-0000-0000-000000000002  # Built-in Data Contributor
```

---

## Deployment

### Azure CLI
```bash
# Create function app
az functionapp create \
  --name colorai-functions \
  --resource-group colorai-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --storage-account coloraistorage

# Deploy functions
func azure functionapp publish colorai-functions --python

# Configure APIM backend
az apim api create \
  --resource-group colorai-rg \
  --service-name colorai-apim \
  --api-id simple-endpoints \
  --path / \
  --display-name "Simple Endpoints" \
  --service-url https://colorai-functions.azurewebsites.net/api
```

### Terraform (Alternative)
```hcl
resource "azurerm_linux_function_app" "simple_endpoints" {
  name                = "colorai-simple-functions"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  storage_account_name = azurerm_storage_account.main.name

  site_config {
    application_stack {
      python_version = "3.11"
    }
  }

  app_settings = {
    "COSMOS_ENDPOINT" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.cosmos_endpoint.id})"
    "FUNCTIONS_WORKER_RUNTIME" = "python"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

---

## Testing & Validation

### Integration Tests
```python
import pytest
import requests

BASE_URL = "https://api.colorai.com"
TOKEN = "..."  # OAuth token

def test_finalized_endpoint():
    response = requests.post(
        f"{BASE_URL}/finalized",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={
            "session_id": "test-session-001",
            "material_id": "MAT99999",
            "status": "done"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data['ok'] == True
    assert data['material_id'] == "MAT99999"

def test_view_history_with_filters():
    response = requests.post(
        f"{BASE_URL}/view-history",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={
            "user_name": "test@avient.com",
            "limit": 5
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert 'items' in data
    assert len(data['items']) <= 5

def test_feedback_submission():
    response = requests.post(
        f"{BASE_URL}/feedback",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={
            "session_id": "test-session-001",
            "feedback": "Test feedback message",
            "category": "Test"
        }
    )
    assert response.status_code == 202
    data = response.json()
    assert data['summary_status'] == 'pending'
```

### Load Testing
```bash
# Use Artillery for load testing
artillery quick --count 100 --num 10 https://api.colorai.com/view-history

# Expected: P95 < 500ms, 0% errors
```

---

## Monitoring

### Application Insights Queries

#### Latency by Endpoint
```kusto
requests
| where url contains "/finalized" or url contains "/view-history" or url contains "/feedback"
| summarize avg(duration), percentile(duration, 95) by name
| order by avg_duration desc
```

#### Error Rate
```kusto
requests
| where url contains "/finalized" or url contains "/view-history" or url contains "/feedback"
| summarize errors = countif(success == false), total = count() by name
| extend error_rate = errors * 100.0 / total
```

#### Top Users by Request Volume
```kusto
requests
| where url contains "/view-history"
| extend user_id = tostring(customDimensions["user_id"])
| summarize count() by user_id
| top 10 by count_
```

### Alerts
1. **High Error Rate**: > 5% for 5 minutes
2. **High Latency**: P95 > 1s for 5 minutes
3. **Cosmos Throttling**: 429 responses detected

---

## Rollback Plan

### If Issues Detected
1. **APIM Traffic Switch**: Route back to legacy FastAPI endpoint
2. **Verify Legacy Still Running**: Confirm old deployment is healthy
3. **Monitor Metrics**: Ensure error rate returns to baseline
4. **Root Cause Analysis**: Investigate logs in Application Insights
5. **Fix Forward or Stay on Legacy**: Deploy hotfix or postpone migration

### Rollback Command
```bash
# Update APIM backend to legacy endpoint
az apim api update \
  --resource-group colorai-rg \
  --service-name colorai-apim \
  --api-id simple-endpoints \
  --service-url https://colorai-legacy.azurewebsites.net/api
```

---

## Success Criteria

✅ All endpoints respond within SLA (P95 < 500ms)
✅ Error rate < 1%
✅ 100% feature parity with current implementation
✅ Integration tests pass
✅ Load tests pass (100 concurrent users)
✅ Monitoring dashboards operational
✅ Zero data loss during migration
