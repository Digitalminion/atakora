# RESTful API Redesign - CRUD Operations

## Overview
Redesign the API following REST principles with proper HTTP verbs and resource-oriented endpoints. Focus on simple CRUD operations against Cosmos DB with clean data models.

---

## Resource Model

### Resource 1: Search Sessions
**Resource Path**: `/sessions`

**Cosmos Container**: `sessions`
**Partition Key**: `/user_id` (better query performance per user)

**Schema**:
```json
{
  "id": "session_550e8400",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "john.doe@avient.com",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:23:45.678Z",
  "status": "completed",
  "search_request": {
    "resin": "PP",
    "color": "blue",
    "L": 45.5,
    "a": 12.3,
    "b": -25.7,
    "k": 20
  },
  "results_summary": {
    "total_results": 38,
    "average_score": 82.5,
    "top_match_id": "MAT12345"
  },
  "selection": {
    "material_id": "MAT12345",
    "selected_at": "2025-10-10T14:23:45.678Z",
    "selection_reason": "Best match for regulatory requirements"
  },
  "metadata": {
    "request_id": "req_550e8400",
    "processing_duration_ms": 8423,
    "search_type": "vector_semantic"
  }
}
```

### Resource 2: Feedback
**Resource Path**: `/feedback`

**Cosmos Container**: `feedback`
**Partition Key**: `/user_id`

**Schema**:
```json
{
  "id": "fb_660f9511",
  "feedback_id": "fb_660f9511-f3ac-52e5-b827-557766551111",
  "user_id": "john.doe@avient.com",
  "session_id": "session_550e8400",
  "created_at": "2025-10-10T14:25:00.000Z",
  "updated_at": "2025-10-10T14:25:30.000Z",
  "category": "feature_request",
  "rating": 4,
  "text": "Would love to see Lab values displayed more prominently in results.",
  "status": "pending",
  "ai_analysis": {
    "sentiment": "positive",
    "summary": "User requests enhanced Lab value visibility in UI.",
    "priority": "medium",
    "analyzed_at": "2025-10-10T14:25:30.000Z"
  },
  "admin_response": {
    "responded_by": "admin@avient.com",
    "responded_at": "2025-10-11T09:00:00.000Z",
    "message": "Thanks for the feedback! We'll include this in our next sprint."
  }
}
```

---

## RESTful API Design

### Sessions Resource

#### 1. Create Session (Search Request)
```
POST /api/sessions
Content-Type: application/json

{
  "search_request": {
    "resin": "PP",
    "color": "blue",
    "L": 45.5,
    "a": 12.3,
    "b": -25.7,
    "k": 20
  }
}

Response: 202 Accepted
{
  "id": "session_550e8400",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "john.doe@avient.com",
  "status": "queued",
  "created_at": "2025-10-10T14:20:00.000Z",
  "_links": {
    "self": "/api/sessions/session_550e8400",
    "status": "/api/sessions/session_550e8400"
  }
}
```

#### 2. Get Session (Status/Results)
```
GET /api/sessions/{session_id}

Response: 200 OK
{
  "id": "session_550e8400",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "john.doe@avient.com",
  "status": "completed",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:20:28.456Z",
  "search_request": {...},
  "results_summary": {...},
  "selection": null,
  "_links": {
    "self": "/api/sessions/session_550e8400",
    "select": "/api/sessions/session_550e8400/selection",
    "results": "/api/sessions/session_550e8400/results"
  }
}
```

#### 3. Get Session Results (Detailed)
```
GET /api/sessions/{session_id}/results

Response: 200 OK
{
  "session_id": "session_550e8400",
  "overall_analysis": {
    "average_score": 82.5,
    "score_distribution": {...}
  },
  "materials": [
    {
      "id": "MAT12345",
      "score": 95.5,
      "attributes": {...},
      "reasoning": "...",
      "_links": {
        "self": "/api/materials/MAT12345",
        "select": "/api/sessions/session_550e8400/selection"
      }
    }
  ],
  "_links": {
    "self": "/api/sessions/session_550e8400/results",
    "session": "/api/sessions/session_550e8400"
  }
}
```

#### 4. Update Session - Select Material
```
PUT /api/sessions/{session_id}/selection
Content-Type: application/json

{
  "material_id": "MAT12345",
  "selection_reason": "Best match for regulatory requirements"
}

Response: 200 OK
{
  "session_id": "session_550e8400",
  "selection": {
    "material_id": "MAT12345",
    "selected_at": "2025-10-10T14:23:45.678Z",
    "selection_reason": "Best match for regulatory requirements"
  },
  "status": "completed",
  "_links": {
    "self": "/api/sessions/session_550e8400",
    "material": "/api/materials/MAT12345"
  }
}
```

#### 5. Update Session - Cancel
```
PATCH /api/sessions/{session_id}
Content-Type: application/json

{
  "status": "cancelled"
}

Response: 200 OK
{
  "session_id": "session_550e8400",
  "status": "cancelled",
  "updated_at": "2025-10-10T14:25:00.000Z"
}
```

#### 6. List Sessions (User History)
```
GET /api/sessions?user_id={user}&status={status}&from={date}&to={date}&limit={n}

Response: 200 OK
{
  "sessions": [
    {
      "id": "session_550e8400",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-10-10T14:20:00.000Z",
      "status": "completed",
      "search_request": {...},
      "selection": {...},
      "_links": {
        "self": "/api/sessions/session_550e8400"
      }
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 20,
    "offset": 0,
    "next": "/api/sessions?user_id=john&limit=20&offset=20"
  },
  "_links": {
    "self": "/api/sessions?user_id=john&limit=20",
    "next": "/api/sessions?user_id=john&limit=20&offset=20"
  }
}
```

#### 7. Delete Session (Soft Delete)
```
DELETE /api/sessions/{session_id}

Response: 204 No Content
```

---

### Feedback Resource

#### 1. Create Feedback
```
POST /api/feedback
Content-Type: application/json

{
  "session_id": "session_550e8400",
  "category": "feature_request",
  "rating": 4,
  "text": "Would love to see Lab values displayed more prominently."
}

Response: 201 Created
Location: /api/feedback/fb_660f9511

{
  "id": "fb_660f9511",
  "feedback_id": "fb_660f9511-f3ac-52e5-b827-557766551111",
  "user_id": "john.doe@avient.com",
  "session_id": "session_550e8400",
  "created_at": "2025-10-10T14:25:00.000Z",
  "category": "feature_request",
  "rating": 4,
  "text": "...",
  "status": "pending",
  "_links": {
    "self": "/api/feedback/fb_660f9511",
    "session": "/api/sessions/session_550e8400"
  }
}
```

#### 2. Get Feedback
```
GET /api/feedback/{feedback_id}

Response: 200 OK
{
  "id": "fb_660f9511",
  "feedback_id": "fb_660f9511-f3ac-52e5-b827-557766551111",
  "user_id": "john.doe@avient.com",
  "session_id": "session_550e8400",
  "created_at": "2025-10-10T14:25:00.000Z",
  "updated_at": "2025-10-10T14:25:30.000Z",
  "category": "feature_request",
  "rating": 4,
  "text": "...",
  "status": "reviewed",
  "ai_analysis": {...},
  "admin_response": {...},
  "_links": {
    "self": "/api/feedback/fb_660f9511",
    "session": "/api/sessions/session_550e8400"
  }
}
```

#### 3. List Feedback (User's Feedback)
```
GET /api/feedback?user_id={user}&status={status}&category={cat}&limit={n}

Response: 200 OK
{
  "feedback": [
    {
      "id": "fb_660f9511",
      "created_at": "2025-10-10T14:25:00.000Z",
      "category": "feature_request",
      "rating": 4,
      "status": "reviewed",
      "text": "...",
      "_links": {
        "self": "/api/feedback/fb_660f9511"
      }
    }
  ],
  "pagination": {...},
  "_links": {...}
}
```

#### 4. List Feedback (Admin View - All Users)
```
GET /api/admin/feedback?status={status}&category={cat}&priority={pri}&from={date}&to={date}

Response: 200 OK (requires admin role)
{
  "feedback": [
    {
      "id": "fb_660f9511",
      "user_id": "john.doe@avient.com",
      "created_at": "2025-10-10T14:25:00.000Z",
      "category": "feature_request",
      "rating": 4,
      "status": "pending",
      "ai_analysis": {...},
      "_links": {
        "self": "/api/feedback/fb_660f9511",
        "respond": "/api/admin/feedback/fb_660f9511/response"
      }
    }
  ],
  "summary": {
    "total": 453,
    "by_status": {
      "pending": 127,
      "reviewed": 298,
      "resolved": 28
    },
    "by_category": {
      "bug": 89,
      "feature_request": 234,
      "ui_ux": 130
    },
    "average_rating": 3.8
  }
}
```

#### 5. Update Feedback (Admin Response)
```
PUT /api/admin/feedback/{feedback_id}/response
Content-Type: application/json

{
  "message": "Thanks for the feedback! We'll include this in our next sprint.",
  "status": "reviewed"
}

Response: 200 OK
{
  "id": "fb_660f9511",
  "status": "reviewed",
  "admin_response": {
    "responded_by": "admin@avient.com",
    "responded_at": "2025-10-11T09:00:00.000Z",
    "message": "..."
  },
  "_links": {
    "self": "/api/feedback/fb_660f9511"
  }
}
```

#### 6. Update Feedback Status
```
PATCH /api/admin/feedback/{feedback_id}
Content-Type: application/json

{
  "status": "resolved",
  "ai_analysis": {
    "priority": "high"
  }
}

Response: 200 OK
```

#### 7. Delete Feedback
```
DELETE /api/feedback/{feedback_id}

Response: 204 No Content
```

---

## Implementation: Azure Functions

### Function: SessionsController

```python
import azure.functions as func
import json
from azure.cosmos import CosmosClient
from datetime import datetime, timezone

app = func.FunctionApp()

# ===== CREATE SESSION =====
@app.route(route="sessions", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def create_session(req: func.HttpRequest) -> func.HttpResponse:
    """POST /api/sessions - Create new search session"""
    try:
        user_id = req.headers.get('user-id')
        payload = req.get_json()

        # Generate IDs
        session_id = str(uuid.uuid4())
        doc_id = f"session_{session_id.split('-')[0]}"

        # Create document
        doc = {
            "id": doc_id,
            "session_id": session_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status": "queued",
            "search_request": payload.get('search_request'),
            "selection": None,
            "results_summary": None
        }

        # Write to Cosmos
        cosmos = get_cosmos_client()
        container = cosmos.get_database_client("colorai").get_container_client("sessions")
        container.create_item(doc)

        # Enqueue for processing (existing async pattern)
        enqueue_search_request(session_id, payload.get('search_request'))

        # Build response with HATEOAS links
        response = {
            "id": doc_id,
            "session_id": session_id,
            "user_id": user_id,
            "status": "queued",
            "created_at": doc['created_at'],
            "_links": {
                "self": f"/api/sessions/{doc_id}",
                "status": f"/api/sessions/{doc_id}"
            }
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=202,
            mimetype='application/json'
        )

    except Exception as e:
        return handle_error(e)

# ===== GET SESSION =====
@app.route(route="sessions/{session_id}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def get_session(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/sessions/{session_id} - Get session details"""
    try:
        session_id = req.route_params.get('session_id')
        user_id = req.headers.get('user-id')

        # Read from Cosmos
        cosmos = get_cosmos_client()
        container = cosmos.get_database_client("colorai").get_container_client("sessions")

        # Query by session_id with user_id partition key
        query = "SELECT * FROM c WHERE c.id = @session_id"
        params = [{"name": "@session_id", "value": session_id}]
        items = list(container.query_items(query=query, parameters=params, partition_key=user_id))

        if not items:
            return func.HttpResponse(
                json.dumps({"error": "Session not found"}),
                status_code=404,
                mimetype='application/json'
            )

        doc = items[0]

        # Build response with HATEOAS
        response = {
            **doc,
            "_links": {
                "self": f"/api/sessions/{session_id}",
                "results": f"/api/sessions/{session_id}/results",
                "select": f"/api/sessions/{session_id}/selection"
            }
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype='application/json'
        )

    except Exception as e:
        return handle_error(e)

# ===== LIST SESSIONS =====
@app.route(route="sessions", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def list_sessions(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/sessions?user_id=X&status=Y&from=Z&to=W&limit=N&offset=M"""
    try:
        # Parse query params
        user_id = req.params.get('user_id') or req.headers.get('user-id')
        status = req.params.get('status')
        date_from = req.params.get('from')
        date_to = req.params.get('to')
        limit = int(req.params.get('limit', 20))
        offset = int(req.params.get('offset', 0))

        # Build query
        where_clauses = []
        params = []

        if status:
            where_clauses.append("c.status = @status")
            params.append({"name": "@status", "value": status})

        if date_from:
            where_clauses.append("c.created_at >= @from")
            params.append({"name": "@from", "value": date_from})

        if date_to:
            where_clauses.append("c.created_at <= @to")
            params.append({"name": "@to", "value": date_to})

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Count total (for pagination)
        count_query = f"SELECT VALUE COUNT(1) FROM c {where_sql}"

        # Data query with pagination
        query = f"""
        SELECT * FROM c
        {where_sql}
        ORDER BY c.created_at DESC
        OFFSET {offset} LIMIT {limit}
        """

        # Execute
        cosmos = get_cosmos_client()
        container = cosmos.get_database_client("colorai").get_container_client("sessions")

        items = list(container.query_items(
            query=query,
            parameters=params,
            partition_key=user_id
        ))

        total = list(container.query_items(
            query=count_query,
            parameters=params,
            partition_key=user_id
        ))[0]

        # Build response
        response = {
            "sessions": [
                {
                    **item,
                    "_links": {"self": f"/api/sessions/{item['id']}"}
                }
                for item in items
            ],
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            },
            "_links": {
                "self": f"/api/sessions?user_id={user_id}&limit={limit}&offset={offset}"
            }
        }

        if (offset + limit) < total:
            response["_links"]["next"] = f"/api/sessions?user_id={user_id}&limit={limit}&offset={offset + limit}"

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype='application/json'
        )

    except Exception as e:
        return handle_error(e)

# ===== UPDATE SESSION - SELECT MATERIAL =====
@app.route(route="sessions/{session_id}/selection", methods=["PUT"], auth_level=func.AuthLevel.FUNCTION)
def update_selection(req: func.HttpRequest) -> func.HttpResponse:
    """PUT /api/sessions/{session_id}/selection"""
    try:
        session_id = req.route_params.get('session_id')
        user_id = req.headers.get('user-id')
        payload = req.get_json()

        # Read existing
        cosmos = get_cosmos_client()
        container = cosmos.get_database_client("colorai").get_container_client("sessions")
        doc = container.read_item(item=session_id, partition_key=user_id)

        # Update selection
        doc['selection'] = {
            "material_id": payload.get('material_id'),
            "selected_at": datetime.now(timezone.utc).isoformat(),
            "selection_reason": payload.get('selection_reason')
        }
        doc['status'] = 'completed'
        doc['updated_at'] = datetime.now(timezone.utc).isoformat()

        # Upsert
        container.upsert_item(doc)

        # Response
        response = {
            "session_id": session_id,
            "selection": doc['selection'],
            "status": doc['status'],
            "_links": {
                "self": f"/api/sessions/{session_id}",
                "material": f"/api/materials/{payload.get('material_id')}"
            }
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype='application/json'
        )

    except Exception as e:
        return handle_error(e)

# ===== PATCH SESSION - UPDATE STATUS =====
@app.route(route="sessions/{session_id}", methods=["PATCH"], auth_level=func.AuthLevel.FUNCTION)
def patch_session(req: func.HttpRequest) -> func.HttpResponse:
    """PATCH /api/sessions/{session_id} - Update status or other fields"""
    try:
        session_id = req.route_params.get('session_id')
        user_id = req.headers.get('user-id')
        payload = req.get_json()

        # Read existing
        cosmos = get_cosmos_client()
        container = cosmos.get_database_client("colorai").get_container_client("sessions")
        doc = container.read_item(item=session_id, partition_key=user_id)

        # Apply patches
        if 'status' in payload:
            doc['status'] = payload['status']

        doc['updated_at'] = datetime.now(timezone.utc).isoformat()

        # Upsert
        container.upsert_item(doc)

        return func.HttpResponse(
            json.dumps({
                "session_id": session_id,
                "status": doc['status'],
                "updated_at": doc['updated_at']
            }),
            status_code=200,
            mimetype='application/json'
        )

    except Exception as e:
        return handle_error(e)

# ===== DELETE SESSION =====
@app.route(route="sessions/{session_id}", methods=["DELETE"], auth_level=func.AuthLevel.FUNCTION)
def delete_session(req: func.HttpRequest) -> func.HttpResponse:
    """DELETE /api/sessions/{session_id} - Soft delete"""
    try:
        session_id = req.route_params.get('session_id')
        user_id = req.headers.get('user-id')

        # Read and mark as deleted
        cosmos = get_cosmos_client()
        container = cosmos.get_database_client("colorai").get_container_client("sessions")
        doc = container.read_item(item=session_id, partition_key=user_id)

        doc['status'] = 'deleted'
        doc['deleted_at'] = datetime.now(timezone.utc).isoformat()
        doc['ttl'] = 2592000  # Delete after 30 days

        container.upsert_item(doc)

        return func.HttpResponse(status_code=204)

    except Exception as e:
        return handle_error(e)
```

---

## APIM Configuration

### API Definition
```yaml
openapi: 3.0.0
info:
  title: Color AI API
  version: 2.0.0
servers:
  - url: https://api.colorai.com

paths:
  /sessions:
    post:
      summary: Create new search session
      operationId: createSession
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSessionRequest'
      responses:
        '202':
          description: Session created and queued for processing
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Session'

    get:
      summary: List user's sessions
      operationId: listSessions
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [queued, processing, completed, cancelled, deleted]
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
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of sessions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionList'

  /sessions/{sessionId}:
    get:
      summary: Get session details
      operationId: getSession
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Session details
        '404':
          description: Session not found

    patch:
      summary: Update session (e.g., cancel)
      operationId: patchSession
      parameters:
        - name: sessionId
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
                  enum: [cancelled]
      responses:
        '200':
          description: Session updated

    delete:
      summary: Delete session
      operationId: deleteSession
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Session deleted

  /sessions/{sessionId}/selection:
    put:
      summary: Select material for session
      operationId: selectMaterial
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - material_id
              properties:
                material_id:
                  type: string
                selection_reason:
                  type: string
      responses:
        '200':
          description: Material selected

  /sessions/{sessionId}/results:
    get:
      summary: Get detailed search results for session
      operationId: getSessionResults
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Search results

  /feedback:
    post:
      summary: Submit feedback
      operationId: createFeedback
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateFeedbackRequest'
      responses:
        '201':
          description: Feedback created
          headers:
            Location:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Feedback'

    get:
      summary: List user's feedback
      operationId: listFeedback
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, reviewed, resolved]
        - name: category
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: List of feedback

  /feedback/{feedbackId}:
    get:
      summary: Get feedback details
      operationId: getFeedback
      parameters:
        - name: feedbackId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Feedback details

    delete:
      summary: Delete feedback
      operationId: deleteFeedback
      parameters:
        - name: feedbackId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Feedback deleted

  /admin/feedback:
    get:
      summary: List all feedback (admin only)
      operationId: listAllFeedback
      security:
        - AdminRole: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
        - name: priority
          in: query
          schema:
            type: string
            enum: [low, medium, high]
      responses:
        '200':
          description: List of all feedback with analytics

  /admin/feedback/{feedbackId}/response:
    put:
      summary: Respond to feedback (admin only)
      operationId: respondToFeedback
      security:
        - AdminRole: []
      parameters:
        - name: feedbackId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - message
              properties:
                message:
                  type: string
                status:
                  type: string
                  enum: [reviewed, resolved]
      responses:
        '200':
          description: Response added

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
    AdminRole:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
          scopes:
            Admin: Admin access

security:
  - BearerAuth: []
```

---

## Benefits of RESTful Design

### 1. **Predictable & Intuitive**
- Standard HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- Resource-oriented URLs
- Clear intent from method + path

### 2. **Better Caching**
- `GET /api/sessions/{id}` can be cached
- `GET /api/sessions?user_id=X` can be cached
- POST/PUT/DELETE invalidate cache

### 3. **HATEOAS (Hypermedia)**
- Responses include `_links` for navigation
- Client discovers available actions
- Reduces coupling (client doesn't hardcode URLs)

### 4. **Proper HTTP Status Codes**
- `200 OK` - Success with body
- `201 Created` - Resource created (+ Location header)
- `202 Accepted` - Async processing started
- `204 No Content` - Success, no body
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Validation error

### 5. **Clean Separation**
- `/api/sessions` - User-facing operations
- `/api/admin/feedback` - Admin operations
- Clear permission boundaries

### 6. **Better Cosmos DB Performance**
- Partition key = `user_id` (not `session_id`)
- Queries within single partition (faster, cheaper)
- Efficient listing of user's sessions/feedback

---

## Migration from Old Endpoints

### Old → New Mapping

| Old Endpoint | New Endpoint | Method | Notes |
|--------------|--------------|--------|-------|
| `POST /search` | `POST /api/sessions` | POST | Same async pattern |
| `GET /status/{id}` | `GET /api/sessions/{id}` | GET | Now RESTful |
| `POST /finalized` | `PUT /api/sessions/{id}/selection` | PUT | Proper resource update |
| `POST /view-history` | `GET /api/sessions` | GET | Query params instead of POST body |
| `POST /feedback` | `POST /api/feedback` | POST | Proper 201 Created |
| N/A | `GET /api/feedback` | GET | New: List user's feedback |
| N/A | `GET /api/admin/feedback` | GET | New: Admin analytics |

---

## Summary of Improvements

✅ **RESTful** - Proper HTTP verbs and resource-oriented design
✅ **Cosmos DB Optimized** - Partition key = user_id for better performance
✅ **HATEOAS** - Self-documenting API with hypermedia links
✅ **Admin Separation** - Clear `/admin/*` routes for privileged operations
✅ **Better Schema** - Rich feedback model with ratings, categories, AI analysis
✅ **Proper Status Codes** - 200, 201, 202, 204, 404, 422
✅ **Query Params for GET** - No more POST for reads
✅ **Pagination** - Built-in with offset/limit
✅ **OpenAPI Spec** - Machine-readable API definition

This is a **modern, standards-compliant API** that follows REST best practices! 🎉
