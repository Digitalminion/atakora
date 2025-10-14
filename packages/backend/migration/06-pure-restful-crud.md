# Pure RESTful CRUD API Design

## Philosophy
Every operation is a standard CRUD action on a resource. No special "actions" or RPC-style endpoints. Just resources and HTTP verbs.

---

## Resource: Search

### Schema
**Container**: `search`
**Partition Key**: `/user_id`

```json
{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "created_at": "2025-10-10T14:20:00Z",
  "updated_at": "2025-10-10T14:23:45Z",
  "status": "completed",
  "criteria": {
    "resin": "PP",
    "color": "blue",
    "opacity": "opaque",
    "lab": {
      "L": 45.5,
      "a": 12.3,
      "b": -25.7
    },
    "k": 20
  },
  "results": {
    "count": 38,
    "average_score": 82.5,
    "materials": [
      {
        "id": "MAT12345",
        "score": 95.5,
        "name": "Premium Blue PP",
        "attributes": {...}
      }
    ]
  },
  "selected_material_id": "MAT12345",
  "selected_at": "2025-10-10T14:23:45Z",
  "metadata": {
    "processing_time_ms": 8423,
    "searches_performed": 4,
    "llm_calls": 6
  }
}
```

### API Endpoints

#### Create Search
```http
POST /search
Content-Type: application/json

{
  "criteria": {
    "resin": "PP",
    "color": "blue",
    "lab": {"L": 45.5, "a": 12.3, "b": -25.7},
    "k": 20
  }
}

201 Created
Location: /search/srch_550e8400
{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "status": "queued",
  "created_at": "2025-10-10T14:20:00Z",
  "criteria": {...}
}
```

#### Get Search
```http
GET /search/srch_550e8400

200 OK
{
  "id": "srch_550e8400",
  "user_id": "john.doe@avient.com",
  "status": "completed",
  "created_at": "2025-10-10T14:20:00Z",
  "updated_at": "2025-10-10T14:20:28Z",
  "criteria": {...},
  "results": {
    "count": 38,
    "average_score": 82.5,
    "materials": [...]
  },
  "selected_material_id": "MAT12345",
  "selected_at": "2025-10-10T14:23:45Z"
}
```

#### Update Search (Select Material)
```http
PUT /search/srch_550e8400
Content-Type: application/json

{
  "selected_material_id": "MAT12345"
}

200 OK
{
  "id": "srch_550e8400",
  "selected_material_id": "MAT12345",
  "selected_at": "2025-10-10T14:23:45Z",
  "status": "completed"
}
```

#### Update Search (Cancel)
```http
PUT /search/srch_550e8400
Content-Type: application/json

{
  "status": "cancelled"
}

200 OK
{
  "id": "srch_550e8400",
  "status": "cancelled",
  "updated_at": "2025-10-10T14:25:00Z"
}
```

#### List Searches
```http
GET /search?status=completed&from=2025-09-01&limit=20

200 OK
{
  "data": [
    {
      "id": "srch_550e8400",
      "status": "completed",
      "created_at": "2025-10-10T14:20:00Z",
      "criteria": {...},
      "selected_material_id": "MAT12345"
    }
  ],
  "total": 127,
  "limit": 20,
  "offset": 0
}
```

#### Delete Search
```http
DELETE /search/srch_550e8400

204 No Content
```

---

## Resource: Feedback

### Schema
**Container**: `feedback`
**Partition Key**: `/user_id`

```json
{
  "id": "fdbk_660f9511",
  "user_id": "john.doe@avient.com",
  "search_id": "srch_550e8400",
  "created_at": "2025-10-10T14:25:00Z",
  "updated_at": "2025-10-10T14:25:30Z",
  "text": "Would love to see Lab values displayed more prominently.",
  "rating": 4,
  "category": "ui_ux",
  "tags": ["enhancement", "visualization"],
  "status": "reviewed",
  "sentiment": "positive",
  "priority": "medium",
  "admin_notes": "Scheduled for next sprint",
  "admin_user_id": "admin@avient.com",
  "admin_updated_at": "2025-10-11T09:00:00Z"
}
```

### API Endpoints

#### Create Feedback
```http
POST /feedback
Content-Type: application/json

{
  "search_id": "srch_550e8400",
  "text": "Would love to see Lab values displayed more prominently.",
  "rating": 4,
  "category": "ui_ux",
  "tags": ["enhancement", "visualization"]
}

201 Created
Location: /feedback/fdbk_660f9511
{
  "id": "fdbk_660f9511",
  "user_id": "john.doe@avient.com",
  "search_id": "srch_550e8400",
  "created_at": "2025-10-10T14:25:00Z",
  "text": "...",
  "rating": 4,
  "category": "ui_ux",
  "status": "pending"
}
```

#### Get Feedback
```http
GET /feedback/fdbk_660f9511

200 OK
{
  "id": "fdbk_660f9511",
  "user_id": "john.doe@avient.com",
  "search_id": "srch_550e8400",
  "created_at": "2025-10-10T14:25:00Z",
  "updated_at": "2025-10-10T14:25:30Z",
  "text": "...",
  "rating": 4,
  "category": "ui_ux",
  "status": "reviewed",
  "sentiment": "positive",
  "priority": "medium",
  "admin_notes": "Scheduled for next sprint",
  "admin_user_id": "admin@avient.com",
  "admin_updated_at": "2025-10-11T09:00:00Z"
}
```

#### Update Feedback (User)
```http
PUT /feedback/fdbk_660f9511
Content-Type: application/json

{
  "text": "Updated: Would love to see Lab values AND color swatches prominently.",
  "rating": 5,
  "tags": ["enhancement", "visualization", "color"]
}

200 OK
{
  "id": "fdbk_660f9511",
  "text": "Updated: Would love to see Lab values AND color swatches prominently.",
  "rating": 5,
  "tags": ["enhancement", "visualization", "color"],
  "updated_at": "2025-10-10T14:30:00Z"
}
```

#### Update Feedback (Admin)
```http
PUT /feedback/fdbk_660f9511
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "status": "reviewed",
  "priority": "high",
  "admin_notes": "Great idea! Scheduled for Sprint 23.",
  "sentiment": "positive"
}

200 OK
{
  "id": "fdbk_660f9511",
  "status": "reviewed",
  "priority": "high",
  "admin_notes": "Great idea! Scheduled for Sprint 23.",
  "admin_user_id": "admin@avient.com",
  "admin_updated_at": "2025-10-11T09:00:00Z"
}
```

#### List Feedback (User's Own)
```http
GET /feedback?status=reviewed&category=ui_ux&limit=10

200 OK
{
  "data": [
    {
      "id": "fdbk_660f9511",
      "created_at": "2025-10-10T14:25:00Z",
      "text": "...",
      "rating": 4,
      "category": "ui_ux",
      "status": "reviewed"
    }
  ],
  "total": 3,
  "limit": 10,
  "offset": 0
}
```

#### List All Feedback (Admin Only)
```http
GET /feedback?all_users=true&status=pending&priority=high
Authorization: Bearer {admin_token}

200 OK
{
  "data": [
    {
      "id": "fdbk_123",
      "user_id": "jane@avient.com",
      "text": "...",
      "rating": 2,
      "status": "pending",
      "priority": "high",
      "sentiment": "negative"
    }
  ],
  "total": 47,
  "summary": {
    "by_status": {"pending": 47, "reviewed": 298, "resolved": 28},
    "by_category": {"bug": 89, "feature_request": 234, "ui_ux": 130},
    "average_rating": 3.8
  }
}
```

#### Delete Feedback
```http
DELETE /feedback/fdbk_660f9511

204 No Content
```

---

## Resource: Materials (New)

### Schema
**Container**: `materials` (read-only, populated from external system)
**Partition Key**: `/material_id`

```json
{
  "id": "MAT12345",
  "material_id": "MAT12345",
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

### API Endpoints

#### Get Material
```http
GET /materials/MAT12345

200 OK
{
  "id": "MAT12345",
  "name": "Premium Blue PP",
  "resin_type": "Polypropylene - Homopolymer",
  "color": "blue",
  "lab": {...},
  "attributes": {...},
  "specifications": {...}
}
```

#### List Materials
```http
GET /materials?resin=PP&color=blue&limit=50

200 OK
{
  "data": [
    {
      "id": "MAT12345",
      "name": "Premium Blue PP",
      "resin_type": "Polypropylene - Homopolymer",
      "lab": {...}
    }
  ],
  "total": 234,
  "limit": 50,
  "offset": 0
}
```

---

## Resource: Data (New)

### Schema
**Container**: `data`
**Partition Key**: `/id`

```json
{
  "id": "ds_20251010",
  "created_at": "2025-10-10T08:00:00Z",
  "created_by": "admin@avient.com",
  "status": "active",
  "blob_url": "https://colorai.blob.core.windows.net/lab-data/MTL_Lab_20251010.csv",
  "file_size_bytes": 11534000,
  "row_count": 5432,
  "validation": {
    "passed": true,
    "errors": [],
    "warnings": ["3 materials have duplicate entries"]
  },
  "activated_at": "2025-10-10T08:05:00Z"
}
```

### API Endpoints

#### Create Data (Upload)
```http
POST /data
Content-Type: multipart/form-data

file: MTL_Lab_20251010.csv

201 Created
Location: /data/ds_20251010
{
  "id": "ds_20251010",
  "status": "validating",
  "created_at": "2025-10-10T08:00:00Z",
  "blob_url": "https://..."
}
```

#### Get Data
```http
GET /data/ds_20251010

200 OK
{
  "id": "ds_20251010",
  "status": "active",
  "created_at": "2025-10-10T08:00:00Z",
  "created_by": "admin@avient.com",
  "blob_url": "https://...",
  "row_count": 5432,
  "validation": {...},
  "activated_at": "2025-10-10T08:05:00Z"
}
```

#### Update Data (Activate)
```http
PUT /data/ds_20251010
Content-Type: application/json

{
  "status": "active"
}

200 OK
{
  "id": "ds_20251010",
  "status": "active",
  "activated_at": "2025-10-10T08:05:00Z"
}
```

#### List Data
```http
GET /data?status=active&limit=10

200 OK
{
  "data": [
    {
      "id": "ds_20251010",
      "status": "active",
      "created_at": "2025-10-10T08:00:00Z",
      "row_count": 5432,
      "activated_at": "2025-10-10T08:05:00Z"
    }
  ],
  "total": 1,
  "current_active": "ds_20251010"
}
```

#### Delete Data
```http
DELETE /data/ds_20251009

204 No Content
```

---

## Implementation: Generic CRUD Controller

### Reusable Pattern
```python
import azure.functions as func
from azure.cosmos import CosmosClient
from datetime import datetime, timezone
import json
import uuid

class ResourceController:
    """Generic CRUD controller for any Cosmos DB resource"""

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

            # Count total (for pagination)
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
            return self.error_response(500, str(e))

    def error_response(self, code: int, message: str) -> func.HttpResponse:
        return func.HttpResponse(
            json.dumps({"error": message}),
            status_code=code,
            mimetype='application/json'
        )


# ===== USAGE: Define Controllers =====

search_controller = ResourceController(
    container_name="search",
    partition_key_field="user_id",
    id_prefix="srch"
)

feedback_controller = ResourceController(
    container_name="feedback",
    partition_key_field="user_id",
    id_prefix="fdbk"
)

data_controller = ResourceController(
    container_name="data",
    partition_key_field="id",
    id_prefix="ds"
)

# ===== ROUTES =====

app = func.FunctionApp()

# Search
@app.route(route="search", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def create_search(req: func.HttpRequest) -> func.HttpResponse:
    return search_controller.create(req)

@app.route(route="search/{id}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def get_search(req: func.HttpRequest) -> func.HttpResponse:
    return search_controller.get(req)

@app.route(route="search/{id}", methods=["PUT"], auth_level=func.AuthLevel.FUNCTION)
def update_search(req: func.HttpRequest) -> func.HttpResponse:
    return search_controller.update(req)

@app.route(route="search/{id}", methods=["DELETE"], auth_level=func.AuthLevel.FUNCTION)
def delete_search(req: func.HttpRequest) -> func.HttpResponse:
    return search_controller.delete(req)

@app.route(route="search", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def list_search(req: func.HttpRequest) -> func.HttpResponse:
    return search_controller.list(req)

# Feedback
@app.route(route="feedback", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def create_feedback(req: func.HttpRequest) -> func.HttpResponse:
    return feedback_controller.create(req)

@app.route(route="feedback/{id}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def get_feedback(req: func.HttpRequest) -> func.HttpResponse:
    return feedback_controller.get(req)

@app.route(route="feedback/{id}", methods=["PUT"], auth_level=func.AuthLevel.FUNCTION)
def update_feedback(req: func.HttpRequest) -> func.HttpResponse:
    return feedback_controller.update(req)

@app.route(route="feedback/{id}", methods=["DELETE"], auth_level=func.AuthLevel.FUNCTION)
def delete_feedback(req: func.HttpRequest) -> func.HttpResponse:
    return feedback_controller.delete(req)

@app.route(route="feedback", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def list_feedback(req: func.HttpRequest) -> func.HttpResponse:
    return feedback_controller.list(req)

# Data
@app.route(route="data", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def create_data(req: func.HttpRequest) -> func.HttpResponse:
    return data_controller.create(req)

@app.route(route="data/{id}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def get_data(req: func.HttpRequest) -> func.HttpResponse:
    return data_controller.get(req)

@app.route(route="data/{id}", methods=["PUT"], auth_level=func.AuthLevel.FUNCTION)
def update_data(req: func.HttpRequest) -> func.HttpResponse:
    return data_controller.update(req)

@app.route(route="data/{id}", methods=["DELETE"], auth_level=func.AuthLevel.FUNCTION)
def delete_data(req: func.HttpRequest) -> func.HttpResponse:
    return data_controller.delete(req)

@app.route(route="data", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def list_data(req: func.HttpRequest) -> func.HttpResponse:
    return data_controller.list(req)
```

---

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.0
info:
  title: Color AI API
  version: 2.0.0
  description: RESTful CRUD API for color material search and feedback

servers:
  - url: https://api.colorai.com/v2

paths:
  # ===== SEARCH =====
  /search:
    post:
      summary: Create search
      tags: [Search]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [criteria]
              properties:
                criteria:
                  type: object
      responses:
        '201':
          description: Search created
          headers:
            Location:
              schema:
                type: string

    get:
      summary: List searches
      tags: [Search]
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [queued, processing, completed, cancelled]
        - name: from
          in: query
          schema:
            type: string
            format: date-time
        - name: to
          in: query
          schema:
            type: string
            format: date-time
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of searches

  /search/{id}:
    get:
      summary: Get search
      tags: [Search]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Search details
        '404':
          description: Not found

    put:
      summary: Update search
      tags: [Search]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                selected_material_id:
                  type: string
                status:
                  type: string
                  enum: [cancelled]
      responses:
        '200':
          description: Search updated

    delete:
      summary: Delete search
      tags: [Search]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted

  # ===== FEEDBACK =====
  /feedback:
    post:
      summary: Create feedback
      tags: [Feedback]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [text]
              properties:
                search_id:
                  type: string
                text:
                  type: string
                rating:
                  type: integer
                  minimum: 1
                  maximum: 5
                category:
                  type: string
                tags:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: Feedback created
          headers:
            Location:
              schema:
                type: string

    get:
      summary: List feedback
      tags: [Feedback]
      parameters:
        - name: all_users
          in: query
          description: Admin only - list all users' feedback
          schema:
            type: boolean
            default: false
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, reviewed, resolved]
        - name: category
          in: query
          schema:
            type: string
        - name: priority
          in: query
          schema:
            type: string
            enum: [low, medium, high]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of feedback

  /feedback/{id}:
    get:
      summary: Get feedback
      tags: [Feedback]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Feedback details
        '404':
          description: Not found

    put:
      summary: Update feedback
      tags: [Feedback]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                rating:
                  type: integer
                tags:
                  type: array
                  items:
                    type: string
                # Admin fields
                status:
                  type: string
                priority:
                  type: string
                admin_notes:
                  type: string
      responses:
        '200':
          description: Feedback updated

    delete:
      summary: Delete feedback
      tags: [Feedback]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted

  # ===== DATA =====
  /data:
    post:
      summary: Upload data
      tags: [Data]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '201':
          description: Dataset uploaded
          headers:
            Location:
              schema:
                type: string

    get:
      summary: List data
      tags: [Data]
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [validating, active, inactive, invalid]
      responses:
        '200':
          description: List of datasets

  /data/{id}:
    get:
      summary: Get data
      tags: [Data]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Dataset details

    put:
      summary: Update data
      tags: [Data]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [active, inactive]
      responses:
        '200':
          description: Dataset updated

    delete:
      summary: Delete data
      tags: [Data]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted

  # ===== MATERIALS (Read-Only) =====
  /materials/{id}:
    get:
      summary: Get material
      tags: [Materials]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Material details

  /materials:
    get:
      summary: List materials
      tags: [Materials]
      parameters:
        - name: resin
          in: query
          schema:
            type: string
        - name: color
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of materials

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

---

## Summary of Pure REST Design

✅ **Only 4 HTTP Verbs**: POST (create), GET (read), PUT (update), DELETE (delete)
✅ **No Special Actions**: Everything is a resource operation
✅ **Resource-Oriented**: `/search`, `/feedback`, `/data`, `/materials`
✅ **Simple Naming**: Singular nouns for cleaner URLs (`/search` not `/searches`, `/data` not `/lab-data`)
✅ **Generic Controller**: Reusable CRUD logic for all resources
✅ **Query Params for Filters**: `?status=X&category=Y` instead of POST body
✅ **Admin via Query Param**: `?all_users=true` with role check
✅ **Proper Status Codes**: 200, 201 (+ Location header), 204, 404
✅ **Pagination Built-In**: `limit`, `offset`, `total` in responses
✅ **OpenAPI Compliant**: Machine-readable spec for client generation

This is **textbook REST** - clean, simple, predictable!
