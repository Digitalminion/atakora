# Final API Design - RESTful + Async Integration

## Overview
This document integrates the **Pure RESTful CRUD pattern** (from `06-pure-restful-crud.md`) with the **Async Request-Response pattern** (from `02-search-endpoint-migration.md`) to create the final, production-ready API design.

## Core Principles

1. **Pure REST**: All endpoints follow resource-oriented design with only POST, GET, PUT, DELETE
2. **Async Long-Running Operations**: Search operations use 202 Accepted pattern
3. **Unified Schema**: Cosmos DB optimized with `/user_id` partition key
4. **Generic Implementation**: Reusable ResourceController for all CRUD operations

---

## Complete API Specification

### Base URL
```
https://api.colorai.avient.com/v2
```

### Authentication
All requests require Bearer token (Azure AD OAuth 2.0):
```http
Authorization: Bearer {token}
```

User context automatically extracted from JWT claims:
- `user-id`: Email address from token subject
- `x-user-role`: User role (user | admin) from token roles claim

---

## Resource: Searches (Async Pattern)

### POST /searches - Create Search (Async)
**Trigger**: Initiates async search orchestration

**Request**:
```http
POST /searches
Authorization: Bearer {token}
Content-Type: application/json

{
  "criteria": {
    "resin": "PP",
    "color": "blue",
    "opacity": "opaque",
    "lab": {
      "L": 45.5,
      "a": 12.3,
      "b": -25.7
    },
    "k": 20,
    "deltaEthresh": 5.0,
    "rerank": true
  }
}
```

**Response (202 Accepted)**:
```http
HTTP/1.1 202 Accepted
Location: /searches/srch_550e8400
Content-Type: application/json

{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "status": "queued",
  "created_at": "2025-10-10T14:20:00Z",
  "criteria": {
    "resin": "PP",
    "color": "blue",
    "k": 20
  },
  "_links": {
    "self": "/searches/srch_550e8400",
    "poll": "/searches/srch_550e8400"
  }
}
```

**Backend Flow**:
1. Accept function validates payload (< 100ms)
2. Writes to Cosmos DB with `status=queued` (< 100ms)
3. Enqueues message to Service Bus `search-requests` queue (< 50ms)
4. Returns 202 with `request_id` (total < 500ms)
5. Service Bus triggers Durable Functions orchestrator (async, 10-30s)
6. Orchestrator updates Cosmos with `status=processing`, then `status=completed`

---

### GET /searches/{id} - Get Search Status/Results

**Purpose**: Poll for search results (client calls every 2-3 seconds)

**Request**:
```http
GET /searches/srch_550e8400
Authorization: Bearer {token}
```

**Response (Still Processing - 202)**:
```http
HTTP/1.1 202 Accepted
Content-Type: application/json
Retry-After: 2

{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "status": "processing",
  "created_at": "2025-10-10T14:20:00Z",
  "updated_at": "2025-10-10T14:20:05Z",
  "metadata": {
    "current_step": "LLM scoring",
    "progress_percent": 65
  },
  "_links": {
    "self": "/searches/srch_550e8400",
    "cancel": "/searches/srch_550e8400"
  }
}
```

**Response (Completed - 200)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "status": "completed",
  "created_at": "2025-10-10T14:20:00Z",
  "updated_at": "2025-10-10T14:20:28Z",
  "criteria": {
    "resin": "PP",
    "color": "blue",
    "k": 20
  },
  "results": {
    "count": 38,
    "average_score": 82.5,
    "overall_analysis": "The search identified 38 high-quality matches...",
    "materials": [
      {
        "id": "MAT12345",
        "score": 95.5,
        "name": "Premium Blue PP",
        "resin_type": "Polypropylene - Homopolymer",
        "color": "blue",
        "opacity": "opaque",
        "lab": {"L": 45.2, "a": 12.1, "b": -25.3},
        "deltaE_cmc": 0.8,
        "flags": {
          "has_uv_resistance": true,
          "fda_compliant": true,
          "near_match": true
        },
        "scoring_details": {
          "resin_match": 1000,
          "color_match": 850,
          "opacity_match": 1000,
          "total_score": 2850
        }
      }
    ]
  },
  "selected_material_id": null,
  "selected_at": null,
  "_links": {
    "self": "/searches/srch_550e8400",
    "select_material": "/searches/srch_550e8400",
    "materials": "/materials"
  }
}
```

**Response (Failed - 500)**:
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "status": "failed",
  "created_at": "2025-10-10T14:20:00Z",
  "updated_at": "2025-10-10T14:20:15Z",
  "error": {
    "code": "LLM_TIMEOUT",
    "message": "LLM API timeout after 3 retries",
    "details": "Azure OpenAI endpoint did not respond within 30 seconds"
  },
  "_links": {
    "self": "/searches/srch_550e8400",
    "retry": "/searches"
  }
}
```

---

### PUT /searches/{id} - Update Search (Select Material or Cancel)

**Use Case 1: Select Material**
```http
PUT /searches/srch_550e8400
Authorization: Bearer {token}
Content-Type: application/json

{
  "selected_material_id": "MAT12345"
}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "srch_550e8400",
  "status": "completed",
  "selected_material_id": "MAT12345",
  "selected_at": "2025-10-10T14:25:00Z",
  "updated_at": "2025-10-10T14:25:00Z"
}
```

**Use Case 2: Cancel Search**
```http
PUT /searches/srch_550e8400
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "cancelled"
}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "srch_550e8400",
  "status": "cancelled",
  "updated_at": "2025-10-10T14:22:00Z"
}
```

**Backend**: If search is still `queued` or `processing`, cancellation triggers Durable Functions `RaiseEventAsync` to stop orchestration.

---

### GET /searches - List User's Searches

**Request**:
```http
GET /searches?status=completed&from=2025-09-01&limit=20&offset=0
Authorization: Bearer {token}
```

**Query Parameters**:
- `status` (optional): Filter by status (queued | processing | completed | cancelled | failed)
- `from` (optional): ISO 8601 date - searches created after this date
- `to` (optional): ISO 8601 date - searches created before this date
- `has_selection` (optional): Boolean - only searches with selected material
- `limit` (optional): Page size (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "srch_550e8400",
      "status": "completed",
      "created_at": "2025-10-10T14:20:00Z",
      "criteria": {
        "resin": "PP",
        "color": "blue",
        "k": 20
      },
      "results_count": 38,
      "selected_material_id": "MAT12345",
      "selected_at": "2025-10-10T14:25:00Z"
    },
    {
      "id": "srch_662f1522",
      "status": "completed",
      "created_at": "2025-10-09T10:15:00Z",
      "criteria": {
        "resin": "PE",
        "color": "red",
        "k": 15
      },
      "results_count": 22,
      "selected_material_id": null
    }
  ],
  "total": 127,
  "limit": 20,
  "offset": 0,
  "_links": {
    "self": "/searches?status=completed&limit=20&offset=0",
    "next": "/searches?status=completed&limit=20&offset=20",
    "create": "/searches"
  }
}
```

**Backend**:
- Single-partition query (`WHERE c.user_id = @user_id`) - fast (~50-100ms)
- Cosmos DB query with OFFSET/LIMIT for pagination
- Returns lightweight projection (no full results)

---

### DELETE /searches/{id} - Delete Search

**Request**:
```http
DELETE /searches/srch_550e8400
Authorization: Bearer {token}
```

**Response (204 No Content)**:
```http
HTTP/1.1 204 No Content
```

**Backend**:
- Soft delete (set `deleted=true`) or hard delete based on requirements
- If search is `processing`, cancels orchestration first

---

## Resource: Feedback (Standard CRUD)

### POST /feedback - Submit Feedback
```http
POST /feedback
Authorization: Bearer {token}
Content-Type: application/json

{
  "search_id": "srch_550e8400",
  "text": "Would love to see Lab values displayed more prominently.",
  "rating": 4,
  "category": "ui_ux",
  "tags": ["enhancement", "visualization"]
}
```

**Response (201 Created)**:
```http
HTTP/1.1 201 Created
Location: /feedback/fdbk_660f9511
Content-Type: application/json

{
  "id": "fdbk_660f9511",
  "user_id": "john.doe@avient.com",
  "search_id": "srch_550e8400",
  "text": "Would love to see Lab values displayed more prominently.",
  "rating": 4,
  "category": "ui_ux",
  "tags": ["enhancement", "visualization"],
  "status": "pending",
  "created_at": "2025-10-10T14:30:00Z"
}
```

---

### GET /feedback/{id} - Get Feedback
```http
GET /feedback/fdbk_660f9511
Authorization: Bearer {token}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "fdbk_660f9511",
  "user_id": "john.doe@avient.com",
  "search_id": "srch_550e8400",
  "text": "Would love to see Lab values displayed more prominently.",
  "rating": 4,
  "category": "ui_ux",
  "tags": ["enhancement", "visualization"],
  "status": "reviewed",
  "sentiment": "positive",
  "priority": "medium",
  "admin_notes": "Scheduled for Sprint 23",
  "admin_user_id": "admin@avient.com",
  "admin_updated_at": "2025-10-11T09:00:00Z",
  "created_at": "2025-10-10T14:30:00Z",
  "updated_at": "2025-10-11T09:00:00Z"
}
```

---

### PUT /feedback/{id} - Update Feedback
**User Updates**:
```http
PUT /feedback/fdbk_660f9511
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "Updated: Would love to see Lab values AND color swatches prominently.",
  "rating": 5,
  "tags": ["enhancement", "visualization", "color"]
}
```

**Admin Updates** (requires `x-user-role: admin`):
```http
PUT /feedback/fdbk_660f9511
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "reviewed",
  "priority": "high",
  "sentiment": "positive",
  "admin_notes": "Great idea! Scheduled for Sprint 23."
}
```

**Response (200 OK)**: Returns updated document

---

### GET /feedback - List Feedback

**User's Own Feedback**:
```http
GET /feedback?status=reviewed&category=ui_ux&limit=10
Authorization: Bearer {token}
```

**Admin: All Users' Feedback**:
```http
GET /feedback?all_users=true&status=pending&priority=high
Authorization: Bearer {admin_token}
```

**Response (200 OK with Admin Summary)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "fdbk_123",
      "user_id": "jane@avient.com",
      "text": "Search results are too slow",
      "rating": 2,
      "status": "pending",
      "priority": "high",
      "sentiment": "negative",
      "created_at": "2025-10-10T10:00:00Z"
    }
  ],
  "total": 47,
  "limit": 20,
  "offset": 0,
  "summary": {
    "by_status": {
      "pending": 47,
      "reviewed": 298,
      "resolved": 28
    },
    "by_category": {
      "bug": 89,
      "feature_request": 234,
      "ui_ux": 130
    },
    "average_rating": 3.8,
    "sentiment_distribution": {
      "positive": 245,
      "neutral": 90,
      "negative": 38
    }
  }
}
```

---

### DELETE /feedback/{id} - Delete Feedback
```http
DELETE /feedback/fdbk_660f9511
Authorization: Bearer {token}
```

**Response (204 No Content)**: Feedback deleted

---

## Resource: Lab Datasets (Admin Only)

### POST /lab-datasets - Upload Lab Data CSV
**Authorization**: Requires `x-user-role: admin`

```http
POST /lab-datasets
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

file: MTL_Lab_20251010.csv
```

**Response (201 Created)**:
```http
HTTP/1.1 201 Created
Location: /lab-datasets/ds_20251010
Content-Type: application/json

{
  "id": "ds_20251010",
  "status": "validating",
  "created_at": "2025-10-10T08:00:00Z",
  "created_by": "admin@avient.com",
  "blob_url": "https://colorai.blob.core.windows.net/lab-data/MTL_Lab_20251010.csv",
  "file_size_bytes": 11534000
}
```

**Backend Flow** (Async Pattern):
1. HTTP function stores file in Blob Storage (< 2s)
2. Writes metadata to Cosmos with `status=validating`
3. Blob write triggers validation function (async)
4. Validation function:
   - Loads CSV
   - Validates schema (required columns: Material, L*, a*, b*)
   - Checks for nulls, duplicates
   - Updates Cosmos with `status=valid` or `status=invalid`

---

### GET /lab-datasets/{id} - Get Dataset Status
```http
GET /lab-datasets/ds_20251010
Authorization: Bearer {admin_token}
```

**Response (200 OK - Validated)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "ds_20251010",
  "status": "valid",
  "created_at": "2025-10-10T08:00:00Z",
  "created_by": "admin@avient.com",
  "blob_url": "https://colorai.blob.core.windows.net/lab-data/MTL_Lab_20251010.csv",
  "file_size_bytes": 11534000,
  "row_count": 5432,
  "validation": {
    "passed": true,
    "columns_found": ["Material", "L*", "a*", "b*"],
    "errors": [],
    "warnings": ["3 materials have duplicate Lab values"]
  },
  "activated_at": null
}
```

---

### PUT /lab-datasets/{id} - Activate Dataset
```http
PUT /lab-datasets/ds_20251010
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "active"
}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "ds_20251010",
  "status": "active",
  "activated_at": "2025-10-10T08:05:00Z",
  "updated_at": "2025-10-10T08:05:00Z"
}
```

**Backend**:
- Deactivates previous dataset (`UPDATE ... SET status='inactive' WHERE status='active'`)
- Activates new dataset
- DeltaE service automatically loads from active dataset on next cold start

---

### GET /lab-datasets - List Datasets
```http
GET /lab-datasets?status=active
Authorization: Bearer {admin_token}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "ds_20251010",
      "status": "active",
      "created_at": "2025-10-10T08:00:00Z",
      "row_count": 5432,
      "activated_at": "2025-10-10T08:05:00Z"
    },
    {
      "id": "ds_20251009",
      "status": "inactive",
      "created_at": "2025-10-09T08:00:00Z",
      "row_count": 5420,
      "activated_at": "2025-10-09T08:05:00Z"
    }
  ],
  "total": 12,
  "current_active": "ds_20251010"
}
```

---

### DELETE /lab-datasets/{id} - Delete Dataset
**Restriction**: Cannot delete active dataset

```http
DELETE /lab-datasets/ds_20251009
Authorization: Bearer {admin_token}
```

**Response (204 No Content)**: Dataset deleted from Cosmos and Blob Storage

---

## Resource: Materials (Read-Only)

### GET /materials/{id} - Get Material
```http
GET /materials/MAT12345
Authorization: Bearer {token}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "MAT12345",
  "name": "Premium Blue PP",
  "resin_type": "Polypropylene - Homopolymer",
  "color": "blue",
  "opacity": "opaque",
  "lab": {
    "L": 45.2,
    "a": 12.1,
    "b": -25.3
  },
  "attributes": {
    "effect": "metallic",
    "industry_standards": ["FDA", "EU"],
    "special_functions": ["UV resistant"]
  },
  "specifications": {
    "density": "0.9 g/cm³",
    "melt_flow_rate": "12 g/10min"
  }
}
```

---

### GET /materials - Search/List Materials
```http
GET /materials?resin=PP&color=blue&limit=50
Authorization: Bearer {token}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "MAT12345",
      "name": "Premium Blue PP",
      "resin_type": "Polypropylene - Homopolymer",
      "color": "blue",
      "lab": {"L": 45.2, "a": 12.1, "b": -25.3}
    }
  ],
  "total": 234,
  "limit": 50,
  "offset": 0
}
```

**Backend**: Direct query to Azure AI Search index (cached by APIM for 5 minutes)

---

## Implementation: Unified ResourceController

### Generic CRUD Controller
```python
import azure.functions as func
from azure.cosmos import CosmosClient
from datetime import datetime, timezone
import json
import uuid

class ResourceController:
    """
    Generic CRUD controller for all Cosmos DB resources.
    Handles standard operations: create, get, update, delete, list.
    """

    def __init__(self, container_name: str, partition_key_field: str, id_prefix: str):
        self.container_name = container_name
        self.partition_key_field = partition_key_field
        self.id_prefix = id_prefix
        self.cosmos = get_cosmos_client()
        self.container = self.cosmos.get_database_client("colorai").get_container_client(container_name)

    def create(self, req: func.HttpRequest) -> func.HttpResponse:
        """POST /{resource}"""
        try:
            user_id = req.headers.get('user-id')
            body = req.get_json()

            # Generate ID
            doc_id = f"{self.id_prefix}_{uuid.uuid4().hex[:8]}"

            # Build document
            doc = {
                "id": doc_id,
                **body,
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            # Create in Cosmos
            created = self.container.create_item(doc)

            return func.HttpResponse(
                json.dumps(created),
                status_code=201,
                headers={"Location": f"/{self.container_name}/{doc_id}"},
                mimetype='application/json'
            )

        except ValueError:
            return self.error_response(400, "Invalid JSON")
        except Exception as e:
            logging.error(f"Create failed: {e}")
            return self.error_response(500, str(e))

    def get(self, req: func.HttpRequest) -> func.HttpResponse:
        """GET /{resource}/{id}"""
        try:
            doc_id = req.route_params.get('id')
            user_id = req.headers.get('user-id')

            # Read from Cosmos
            doc = self.container.read_item(
                item=doc_id,
                partition_key=user_id if self.partition_key_field == "user_id" else doc_id
            )

            return func.HttpResponse(
                json.dumps(doc),
                status_code=200,
                mimetype='application/json'
            )

        except Exception as e:
            return self.error_response(404, "Resource not found")

    def update(self, req: func.HttpRequest) -> func.HttpResponse:
        """PUT /{resource}/{id}"""
        try:
            doc_id = req.route_params.get('id')
            user_id = req.headers.get('user-id')
            updates = req.get_json()

            # Read existing
            doc = self.container.read_item(
                item=doc_id,
                partition_key=user_id if self.partition_key_field == "user_id" else doc_id
            )

            # Apply updates
            doc.update(updates)
            doc["updated_at"] = datetime.now(timezone.utc).isoformat()

            # Upsert
            updated = self.container.upsert_item(doc)

            return func.HttpResponse(
                json.dumps(updated),
                status_code=200,
                mimetype='application/json'
            )

        except ValueError:
            return self.error_response(400, "Invalid JSON")
        except Exception as e:
            return self.error_response(404, "Resource not found")

    def delete(self, req: func.HttpRequest) -> func.HttpResponse:
        """DELETE /{resource}/{id}"""
        try:
            doc_id = req.route_params.get('id')
            user_id = req.headers.get('user-id')

            # Delete from Cosmos
            self.container.delete_item(
                item=doc_id,
                partition_key=user_id if self.partition_key_field == "user_id" else doc_id
            )

            return func.HttpResponse(status_code=204)

        except Exception as e:
            return self.error_response(404, "Resource not found")

    def list(self, req: func.HttpRequest) -> func.HttpResponse:
        """GET /{resource}?filters"""
        try:
            user_id = req.headers.get('user-id')
            is_admin = req.headers.get('x-user-role') == 'admin'
            all_users = req.params.get('all_users') == 'true'

            # Build query
            where_clauses = []
            params = []

            # Filter by user unless admin with all_users flag
            if not (is_admin and all_users):
                where_clauses.append(f"c.{self.partition_key_field} = @user_id")
                params.append({"name": "@user_id", "value": user_id})

            # Add query param filters
            for key, value in req.params.items():
                if key not in ['limit', 'offset', 'all_users']:
                    where_clauses.append(f"c.{key} = @{key}")
                    params.append({"name": f"@{key}", "value": value})

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # Pagination
            limit = int(req.params.get('limit', 20))
            offset = int(req.params.get('offset', 0))

            # Query
            query = f"""
            SELECT * FROM c
            {where_sql}
            ORDER BY c.created_at DESC
            OFFSET {offset} LIMIT {limit}
            """

            items = list(self.container.query_items(
                query=query,
                parameters=params,
                enable_cross_partition_query=(is_admin and all_users)
            ))

            # Count total
            count_query = f"SELECT VALUE COUNT(1) FROM c {where_sql}"
            total = list(self.container.query_items(
                query=count_query,
                parameters=params,
                enable_cross_partition_query=(is_admin and all_users)
            ))[0] if where_sql else 0

            # Response
            response = {
                "data": items,
                "total": total,
                "limit": limit,
                "offset": offset
            }

            return func.HttpResponse(
                json.dumps(response),
                status_code=200,
                mimetype='application/json'
            )

        except Exception as e:
            logging.error(f"List failed: {e}")
            return self.error_response(500, str(e))

    def error_response(self, code: int, message: str) -> func.HttpResponse:
        return func.HttpResponse(
            json.dumps({"error": message}),
            status_code=code,
            mimetype='application/json'
        )


# ===== Controller Instances =====

searches_controller = ResourceController(
    container_name="searches",
    partition_key_field="user_id",
    id_prefix="srch"
)

feedback_controller = ResourceController(
    container_name="feedback",
    partition_key_field="user_id",
    id_prefix="fdbk"
)

lab_datasets_controller = ResourceController(
    container_name="lab_datasets",
    partition_key_field="id",
    id_prefix="ds"
)
```

---

## Async Integration: Searches Controller

The searches controller extends the base ResourceController with **async orchestration**:

```python
class SearchesController(ResourceController):
    """
    Extends ResourceController with async orchestration support.
    """

    def __init__(self):
        super().__init__(
            container_name="searches",
            partition_key_field="user_id",
            id_prefix="srch"
        )
        self.sb_client = get_service_bus_client()

    def create(self, req: func.HttpRequest) -> func.HttpResponse:
        """
        POST /searches
        Override to add Service Bus enqueue logic.
        """
        try:
            user_id = req.headers.get('user-id')
            body = req.get_json()

            # Validate criteria
            validation_errors = self.validate_criteria(body.get('criteria', {}))
            if validation_errors:
                return self.error_response(400, {"errors": validation_errors})

            # Generate ID
            search_id = f"srch_{uuid.uuid4().hex[:8]}"

            # Build document
            doc = {
                "id": search_id,
                "user_id": user_id,
                "status": "queued",
                "criteria": body.get('criteria'),
                "results": None,
                "selected_material_id": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "ttl": 2592000  # 30 days
            }

            # Write to Cosmos
            self.container.create_item(doc)

            # Enqueue to Service Bus
            sender = self.sb_client.get_queue_sender("search-requests")
            message = ServiceBusMessage(
                body=json.dumps({"request_id": search_id}),
                content_type="application/json",
                message_id=search_id
            )
            sender.send_messages(message)
            sender.close()

            # Return 202 Accepted
            return func.HttpResponse(
                json.dumps({
                    "id": search_id,
                    "user_id": user_id,
                    "status": "queued",
                    "created_at": doc["created_at"],
                    "criteria": doc["criteria"],
                    "_links": {
                        "self": f"/searches/{search_id}",
                        "poll": f"/searches/{search_id}"
                    }
                }),
                status_code=202,
                headers={"Location": f"/searches/{search_id}"},
                mimetype='application/json'
            )

        except Exception as e:
            logging.error(f"Search create failed: {e}")
            return self.error_response(500, str(e))

    def get(self, req: func.HttpRequest) -> func.HttpResponse:
        """
        GET /searches/{id}
        Override to return 202 if still processing.
        """
        try:
            search_id = req.route_params.get('id')
            user_id = req.headers.get('user-id')

            # Read from Cosmos
            doc = self.container.read_item(item=search_id, partition_key=user_id)

            # Check status
            if doc['status'] in ['queued', 'processing', 'scoring']:
                # Still processing - return 202
                return func.HttpResponse(
                    json.dumps({
                        "id": doc['id'],
                        "status": doc['status'],
                        "created_at": doc['created_at'],
                        "updated_at": doc['updated_at'],
                        "metadata": doc.get('metadata', {}),
                        "_links": {
                            "self": f"/searches/{search_id}",
                            "cancel": f"/searches/{search_id}"
                        }
                    }),
                    status_code=202,
                    headers={"Retry-After": "2"},
                    mimetype='application/json'
                )

            elif doc['status'] == 'completed':
                # Completed - return 200 with results
                return func.HttpResponse(
                    json.dumps(doc),
                    status_code=200,
                    mimetype='application/json'
                )

            elif doc['status'] == 'failed':
                # Failed - return 500 with error
                return func.HttpResponse(
                    json.dumps(doc),
                    status_code=500,
                    mimetype='application/json'
                )

            elif doc['status'] == 'cancelled':
                # Cancelled - return 200
                return func.HttpResponse(
                    json.dumps(doc),
                    status_code=200,
                    mimetype='application/json'
                )

        except Exception as e:
            return self.error_response(404, "Search not found")

    def validate_criteria(self, criteria: dict) -> list:
        """Validate search criteria"""
        errors = []

        if 'k' not in criteria:
            errors.append("Missing required field: k")
        elif not isinstance(criteria['k'], int) or criteria['k'] < 1 or criteria['k'] > 100:
            errors.append("Field 'k' must be integer between 1 and 100")

        # Check Lab values
        lab = criteria.get('lab', {})
        lab_fields = ['L', 'a', 'b']
        lab_provided = [f for f in lab_fields if f in lab and lab[f] is not None]
        if lab_provided and len(lab_provided) < 3:
            errors.append("If providing Lab values, all three (L, a, b) are required")

        return errors


# ===== Route Registration =====

app = func.FunctionApp()
searches_ctrl = SearchesController()

@app.route(route="searches", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def create_search(req: func.HttpRequest) -> func.HttpResponse:
    return searches_ctrl.create(req)

@app.route(route="searches/{id}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def get_search(req: func.HttpRequest) -> func.HttpResponse:
    return searches_ctrl.get(req)

@app.route(route="searches/{id}", methods=["PUT"], auth_level=func.AuthLevel.FUNCTION)
def update_search(req: func.HttpRequest) -> func.HttpResponse:
    return searches_ctrl.update(req)

@app.route(route="searches/{id}", methods=["DELETE"], auth_level=func.AuthLevel.FUNCTION)
def delete_search(req: func.HttpRequest) -> func.HttpResponse:
    return searches_ctrl.delete(req)

@app.route(route="searches", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def list_searches(req: func.HttpRequest) -> func.HttpResponse:
    return searches_ctrl.list(req)
```

---

## Frontend Client Example

### JavaScript/TypeScript Client

```typescript
class ColorAIClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Submit async search request
   */
  async createSearch(criteria: SearchCriteria): Promise<Search> {
    const response = await fetch(`${this.baseUrl}/searches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ criteria })
    });

    if (response.status !== 202) {
      throw new Error(`Search creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Poll for search results
   */
  async pollSearchResults(searchId: string, onProgress?: (status: string) => void): Promise<Search> {
    const pollInterval = 2000; // 2 seconds

    while (true) {
      const response = await fetch(`${this.baseUrl}/searches/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const search = await response.json();

      // Update progress
      if (onProgress) {
        onProgress(search.status);
      }

      // Check if completed
      if (response.status === 200 && search.status === 'completed') {
        return search;
      }

      // Check if failed
      if (search.status === 'failed') {
        throw new Error(`Search failed: ${search.error.message}`);
      }

      // Still processing, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Select material from search results
   */
  async selectMaterial(searchId: string, materialId: string): Promise<Search> {
    const response = await fetch(`${this.baseUrl}/searches/${searchId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selected_material_id: materialId
      })
    });

    if (response.status !== 200) {
      throw new Error(`Material selection failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List user's search history
   */
  async listSearches(filters?: SearchFilters): Promise<SearchList> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}/searches?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (response.status !== 200) {
      throw new Error(`List searches failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: FeedbackInput): Promise<Feedback> {
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });

    if (response.status !== 201) {
      throw new Error(`Feedback submission failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// ===== Usage Example =====

const client = new ColorAIClient('https://api.colorai.avient.com/v2', userToken);

// Create search
const search = await client.createSearch({
  resin: 'PP',
  color: 'blue',
  lab: { L: 45.5, a: 12.3, b: -25.7 },
  k: 20
});

console.log(`Search created: ${search.id}`);

// Poll for results with progress updates
const completedSearch = await client.pollSearchResults(
  search.id,
  (status) => console.log(`Search status: ${status}`)
);

console.log(`Search completed with ${completedSearch.results.count} materials`);

// Select material
await client.selectMaterial(search.id, completedSearch.results.materials[0].id);

// Submit feedback
await client.submitFeedback({
  search_id: search.id,
  text: 'Great results!',
  rating: 5,
  category: 'general'
});
```

---

## Summary

This final API design successfully integrates:

✅ **Pure RESTful CRUD**: All endpoints follow resource-oriented design
✅ **Async Long-Running Operations**: Search uses 202 Accepted + polling pattern
✅ **Unified Implementation**: Generic ResourceController for all resources
✅ **Optimized Database**: `/user_id` partition key for fast queries
✅ **Admin Operations**: Query param `?all_users=true` for admin access
✅ **Proper HTTP Semantics**: Status codes (200, 201, 202, 204, 404, 500)
✅ **OpenAPI Compliant**: Machine-readable specification for client generation
✅ **Production-Ready**: Error handling, validation, monitoring hooks

**Key Differentiators**:
- `/searches` is the **only async resource** (others are standard CRUD)
- All updates via `PUT` (no separate "action" endpoints)
- Progressive status updates during long-running operations
- Client libraries can be auto-generated from OpenAPI spec
