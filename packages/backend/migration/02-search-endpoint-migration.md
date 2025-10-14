# Search Endpoint Migration - Async Request-Response Pattern

## Overview
Transform the synchronous `/search` endpoint into an async request-response pattern using Service Bus queue-driven orchestration with Durable Functions.

## Architecture

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /search (payload)
     ▼
┌─────────────────────────────────────┐
│           APIM Gateway              │
│  • Validate JWT token               │
│  • Rate limit (100/min per user)    │
│  • Log request                      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Function: SearchRequestAccept      │
│  (HTTP Trigger)                     │
│                                     │
│  1. Validate payload                │
│  2. Generate request_id             │
│  3. Write to Cosmos (status=queued) │
│  4. Enqueue to Service Bus          │
│  5. Return 202 + request_id         │
│                                     │
│  Duration: < 500ms                  │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────┐
│ Service Bus Queue│
│  Message:        │
│  {request_id}    │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Durable Function:                  │
│  SearchOrchestrator                 │
│  (Service Bus Trigger)              │
│                                     │
│  Activities:                        │
│  1. ResinMapping                    │
│  2. SynonymGeneration (LLM)         │
│  3. DeltaEFiltering                 │
│  4. VectorSearch (4x parallel)      │
│  5. Deduplicate                     │
│  6. ScoreChunks (5x parallel)       │
│  7. OverallAnalysis (LLM)           │
│  8. ComputeFlags                    │
│  9. ComputeLabDiffs                 │
│ 10. UpdateResults                   │
│                                     │
│  Duration: 10-30s                   │
└─────────────────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │   Cosmos DB   │
     │ (status=      │
     │  completed,   │
     │  results={})  │
     └───────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Optional: SignalR Push             │
│  Notify client of completion        │
└─────────────────────────────────────┘
```

## Component 1: Request Accept Function

### Trigger
HTTP POST

### Function Code Structure
```python
import azure.functions as func
import json
import uuid
from datetime import datetime, timezone
from azure.cosmos import CosmosClient
from azure.servicebus import ServiceBusClient, ServiceBusMessage

def main(req: func.HttpRequest, cosmos_client: CosmosClient, sb_client: ServiceBusClient) -> func.HttpResponse:
    """
    Accept search request and enqueue for async processing.
    Returns immediately with request_id for status polling.
    """
    try:
        # Parse payload
        payload = req.get_json()

        # Extract headers
        user_id = req.headers.get('user-id', '')
        session_id = req.headers.get('session-id', str(uuid.uuid4()))

        # Generate unique request ID
        request_id = f"req_{uuid.uuid4()}"

        # Validate payload (basic schema check)
        validation_errors = validate_search_payload(payload)
        if validation_errors:
            return func.HttpResponse(
                json.dumps({"errors": validation_errors}),
                status_code=400,
                mimetype='application/json'
            )

        # Create Cosmos document
        now = datetime.now(timezone.utc).isoformat()
        cosmos_doc = {
            "id": request_id,
            "request_id": request_id,
            "session_id": session_id,
            "user_id": user_id,
            "created_at": now,
            "updated_at": now,
            "status": "queued",
            "request_payload": payload,
            "results": None,
            "error": None,
            "ttl": 2592000  # 30 days
        }

        # Write to Cosmos
        container = cosmos_client.get_database_client("colorai").get_container_client("search-requests")
        container.create_item(cosmos_doc)

        # Enqueue message
        sender = sb_client.get_queue_sender("search-requests")
        message = ServiceBusMessage(
            body=json.dumps({"request_id": request_id}),
            content_type="application/json",
            message_id=request_id,  # For deduplication
            session_id=session_id   # For ordering if needed
        )
        message.application_properties = {
            "user_id": user_id,
            "rerank": payload.get('rerank', True),
            "has_lab": bool(payload.get('L') or payload.get('a') or payload.get('b'))
        }
        sender.send_messages(message)
        sender.close()

        # Return 202 Accepted
        return func.HttpResponse(
            json.dumps({
                "request_id": request_id,
                "status": "queued",
                "message": "Search request accepted. Poll /status/{request_id} for results.",
                "status_url": f"/status/{request_id}"
            }),
            status_code=202,
            mimetype='application/json'
        )

    except ValueError as e:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON payload"}),
            status_code=400,
            mimetype='application/json'
        )
    except Exception as e:
        logging.error(f"Request accept failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Internal server error"}),
            status_code=500,
            mimetype='application/json'
        )

def validate_search_payload(payload: dict) -> list:
    """Validate required fields and types"""
    errors = []

    # Check k parameter
    if 'k' not in payload:
        errors.append("Missing required field: k")
    elif not isinstance(payload['k'], int) or payload['k'] < 1 or payload['k'] > 100:
        errors.append("Field 'k' must be integer between 1 and 100")

    # Check Lab values (if provided, all 3 required)
    lab_fields = ['L', 'a', 'b']
    lab_provided = [f for f in lab_fields if f in payload and payload[f] != 0.0]
    if lab_provided and len(lab_provided) < 3:
        errors.append("If providing Lab values, all three (L, a, b) are required")

    return errors
```

### Bindings (function.json)
```json
{
  "scriptFile": "search_request_accept.py",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "search"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

### Response Format
**Success (202 Accepted)**:
```json
{
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Search request accepted. Poll /status/{request_id} for results.",
  "status_url": "/status/req_550e8400-e29b-41d4-a716-446655440000"
}
```

**Error (400 Bad Request)**:
```json
{
  "errors": [
    "Missing required field: k",
    "Field 'L' must be float between 0 and 100"
  ]
}
```

## Component 2: Search Orchestrator (Durable Functions)

### Orchestrator Function
```python
import azure.durable_functions as df
import logging

def orchestrator_function(context: df.DurableOrchestrationContext):
    """
    Main orchestration for search workflow.
    Coordinates 10+ activities with parallel execution where possible.
    """
    request_id = context.get_input()['request_id']
    logging.info(f"[Orchestrator] Starting search for request_id={request_id}")

    try:
        # Activity 1: Load request from Cosmos
        request_data = yield context.call_activity('LoadRequest', request_id)
        payload = request_data['request_payload']

        # Update status to processing
        yield context.call_activity('UpdateStatus', {
            'request_id': request_id,
            'status': 'processing',
            'metadata': {'started_at': context.current_utc_datetime.isoformat()}
        })

        # Activity 2: Resin mapping (fast, inline)
        mapped_payload = yield context.call_activity('ResinMapping', payload)

        # Activity 3: LLM synonym generation (2-3s)
        synonyms = yield context.call_activity('GenerateSynonyms', {
            'resin': mapped_payload.get('REQUEST_RESIN_FINAL'),
            'request_id': request_id
        })

        # Activity 4: DeltaE filtering (if Lab values present)
        deltae_filter = None
        if payload.get('L') or payload.get('a') or payload.get('b'):
            deltae_filter = yield context.call_activity('DeltaEFiltering', {
                'L': payload.get('L', 0.0),
                'a': payload.get('a', 0.0),
                'b': payload.get('b', 0.0),
                'threshold': payload.get('deltaEthresh', 0.0),
                'request_id': request_id
            })

        # Activity 5: Parallel vector searches (4x: base + 3 synonyms)
        search_tasks = []

        # Base search
        search_tasks.append(
            context.call_activity('VectorSearch', {
                'request_id': request_id,
                'payload': mapped_payload,
                'filter': deltae_filter,
                'k': payload.get('k', 20),
                'search_type': 'base'
            })
        )

        # Synonym searches
        for idx, synonym in enumerate(synonyms[:3]):  # Limit to 3
            syn_payload = mapped_payload.copy()
            syn_payload['REQUEST_RESIN_FINAL'] = synonym
            search_tasks.append(
                context.call_activity('VectorSearch', {
                    'request_id': request_id,
                    'payload': syn_payload,
                    'filter': deltae_filter,
                    'k': 5,  # Smaller k for synonyms
                    'search_type': f'synonym_{idx+1}'
                })
            )

        # Execute all searches in parallel
        search_results_arrays = yield context.task_all(search_tasks)

        # Activity 6: Deduplicate results
        deduped_results = yield context.call_activity('DeduplicateResults', {
            'results_arrays': search_results_arrays,
            'request_id': request_id
        })

        # Check rerank flag
        rerank = payload.get('rerank', True)

        if not rerank:
            # No scoring, return raw results
            yield context.call_activity('UpdateStatus', {
                'request_id': request_id,
                'status': 'completed',
                'results': {'search_results': deduped_results}
            })
            return {'status': 'completed', 'results_count': len(deduped_results)}

        # ===== RERANK PATH =====

        # Update status to scoring
        yield context.call_activity('UpdateStatus', {
            'request_id': request_id,
            'status': 'scoring',
            'metadata': {'results_to_score': len(deduped_results)}
        })

        # Activity 7: Parallel LLM scoring (5x chunks)
        scoring_input = {
            'request': build_scoring_request(mapped_payload, synonyms),
            'search_results': deduped_results
        }

        # Split into 5 chunks
        chunks = split_into_chunks(deduped_results, 5)
        scoring_tasks = []
        for idx, chunk in enumerate(chunks):
            scoring_tasks.append(
                context.call_activity('ScoreChunk', {
                    'request_id': request_id,
                    'request_block': scoring_input['request'],
                    'chunk': chunk,
                    'chunk_id': idx
                })
            )

        # Execute all scoring in parallel
        scored_chunks = yield context.task_all(scoring_tasks)

        # Activity 8: Merge scored results
        merged_scored = yield context.call_activity('MergeScoredResults', {
            'chunks': scored_chunks,
            'request_id': request_id
        })

        # Activity 9: Overall analysis (single LLM call)
        overall = yield context.call_activity('OverallAnalysis', {
            'request_id': request_id,
            'request_block': scoring_input['request'],
            'scored_results': merged_scored
        })

        # Activities 10-11: Parallel enrichments (flags + lab diffs)
        enrichment_tasks = [
            context.call_activity('ComputeFlags', {
                'request_id': request_id,
                'request_block': scoring_input['request'],
                'results': merged_scored
            }),
            context.call_activity('ComputeLabDiffs', {
                'request_id': request_id,
                'request_lab': {
                    'L': payload.get('L', 0.0),
                    'a': payload.get('a', 0.0),
                    'b': payload.get('b', 0.0)
                },
                'results': merged_scored
            })
        ]

        flags, lab_diffs = yield context.task_all(enrichment_tasks)

        # Activity 12: Stitch enrichments
        final_results = yield context.call_activity('StitchEnrichments', {
            'request_id': request_id,
            'scored_results': merged_scored,
            'flags': flags,
            'lab_diffs': lab_diffs
        })

        # Activity 13: Update Cosmos with final results
        yield context.call_activity('UpdateStatus', {
            'request_id': request_id,
            'status': 'completed',
            'results': {
                'overall_scoring_analysis': overall,
                'search_results': final_results
            },
            'metadata': {
                'completed_at': context.current_utc_datetime.isoformat(),
                'total_results': len(final_results)
            }
        })

        return {'status': 'completed', 'results_count': len(final_results)}

    except Exception as e:
        logging.error(f"[Orchestrator] Failed for request_id={request_id}: {e}")
        yield context.call_activity('UpdateStatus', {
            'request_id': request_id,
            'status': 'failed',
            'error': str(e)
        })
        return {'status': 'failed', 'error': str(e)}
```

### Key Activity Functions

#### Activity: GenerateSynonyms
```python
async def generate_synonyms_activity(activity_input: dict) -> list:
    """Call Azure OpenAI to generate 3 synonym resins"""
    resin = activity_input['resin']

    # Load prompt from config
    prompt = load_config_value('prompt_templates.yaml', 'synonym_resins')

    # Call LLM
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=os.getenv('LLM_MODEL'),
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": resin}
        ],
        temperature=0
    )

    # Parse JSON response
    synonyms = parse_resin_suggestions(response.choices[0].message.content)
    return synonyms[:3]  # Limit to 3
```

#### Activity: DeltaEFiltering
```python
def deltae_filtering_activity(activity_input: dict) -> str:
    """
    Load Lab CSV from blob, compute Delta-E CMC, return filter string.
    Uses persistent in-memory DataFrame (Premium plan keeps warm).
    """
    global deltaE_df  # Cached DataFrame

    if deltaE_df is None:
        # Load from blob on cold start
        blob_client = get_blob_client('lab-data', 'MTL_Lab_active.csv')
        csv_data = blob_client.download_blob().readall()
        deltaE_df = pd.read_csv(io.BytesIO(csv_data))

    # Extract inputs
    L = activity_input['L']
    a = activity_input['a']
    b = activity_input['b']
    threshold = activity_input['threshold']

    # Vectorized Delta-E CMC calculation
    target = np.array([[L, a, b]])
    lab_array = deltaE_df[['L*', 'a*', 'b*']].to_numpy()
    deltaEs = color.deltaE_cmc(lab_array, target, kL=2, kC=1)

    # Filter materials within threshold
    matches = deltaE_df[deltaEs <= threshold]['Material'].tolist()

    if matches:
        # Build Azure Search filter
        values_str = ",".join(matches)
        return f"search.in(id, '{values_str}', ',')"
    else:
        return None
```

#### Activity: VectorSearch
```python
async def vector_search_activity(activity_input: dict) -> list:
    """Execute hybrid vector + semantic search via Azure AI Search"""
    payload = activity_input['payload']
    filter_str = activity_input.get('filter')
    k = activity_input['k']

    # Build query string
    query = build_query_string_from_payload(payload)

    # Get search client
    search_client = get_search_client()
    embedder = get_embedder()

    # Create vector query
    vector_query = VectorizedQuery(
        vector=embedder.embed_query(query),
        k_nearest_neighbors=50,
        fields="content_vector"
    )

    # Execute search
    results = search_client.search(
        search_text=query,
        vector_queries=[vector_query],
        semantic_configuration_name="my-semantic-config",
        scoring_profile="textBoostProfile",
        query_type=QueryType.SEMANTIC,
        filter=filter_str,
        select=get_select_fields(),
        top=k
    )

    # Normalize results
    return [normalize_search_result(r) for r in results]
```

### Bindings (Orchestrator)
```json
{
  "scriptFile": "search_orchestrator.py",
  "bindings": [
    {
      "name": "context",
      "type": "orchestrationTrigger",
      "direction": "in"
    }
  ]
}
```

### Service Bus Trigger (Starter)
```python
import azure.functions as func
import azure.durable_functions as df

async def main(msg: func.ServiceBusMessage, starter: str):
    """
    Service Bus trigger that starts the durable orchestration.
    """
    client = df.DurableOrchestrationClient(starter)

    # Parse message
    message_body = json.loads(msg.get_body().decode('utf-8'))
    request_id = message_body['request_id']

    # Start orchestration
    instance_id = await client.start_new(
        "SearchOrchestrator",
        client_input=message_body,
        instance_id=request_id  # Use request_id as instance_id for idempotency
    )

    logging.info(f"Started orchestration with ID = '{instance_id}' for request_id = '{request_id}'")
```

## Component 3: Status Endpoint

### Function Code
```python
import azure.functions as func
import json
from azure.cosmos import CosmosClient

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Get status and results of async search request.
    """
    request_id = req.route_params.get('request_id')

    if not request_id:
        return func.HttpResponse(
            json.dumps({"error": "request_id required"}),
            status_code=400,
            mimetype='application/json'
        )

    try:
        # Read from Cosmos
        container = cosmos_client.get_database_client("colorai").get_container_client("search-requests")
        doc = container.read_item(item=request_id, partition_key=request_id)

        # Build response
        response = {
            "request_id": doc['request_id'],
            "status": doc['status'],
            "created_at": doc['created_at'],
            "updated_at": doc['updated_at']
        }

        # Include results if completed
        if doc['status'] == 'completed' and doc.get('results'):
            response['results'] = doc['results']
            return func.HttpResponse(
                json.dumps(response),
                status_code=200,
                mimetype='application/json'
            )

        # Include error if failed
        elif doc['status'] == 'failed':
            response['error'] = doc.get('error', 'Unknown error')
            return func.HttpResponse(
                json.dumps(response),
                status_code=500,
                mimetype='application/json'
            )

        # Still processing
        else:
            response['message'] = f"Request is {doc['status']}. Please poll again."
            return func.HttpResponse(
                json.dumps(response),
                status_code=202,
                mimetype='application/json'
            )

    except Exception as e:
        logging.error(f"Status lookup failed for {request_id}: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Request not found"}),
            status_code=404,
            mimetype='application/json'
        )
```

### Response Examples

**Queued (202)**:
```json
{
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:20:00.000Z",
  "message": "Request is queued. Please poll again."
}
```

**Processing (202)**:
```json
{
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:20:05.123Z",
  "message": "Request is processing. Please poll again."
}
```

**Completed (200)**:
```json
{
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:20:28.456Z",
  "results": {
    "overall_scoring_analysis": {...},
    "search_results": [...]
  }
}
```

**Failed (500)**:
```json
{
  "request_id": "req_550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "created_at": "2025-10-10T14:20:00.000Z",
  "updated_at": "2025-10-10T14:20:15.789Z",
  "error": "LLM API timeout after 3 retries"
}
```

## Client Integration

### Frontend Flow
```javascript
// 1. Submit search request
const response = await fetch('/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'user-id': 'john.doe@avient.com',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    REQUEST_RESIN_FINAL: 'PP',
    REQUEST_COLOR_DESCR: 'blue',
    L: 45.5,
    a: 12.3,
    b: -25.7,
    k: 20
  })
});

const { request_id, status_url } = await response.json();

// 2. Poll status (every 2 seconds)
const pollStatus = async () => {
  const statusResponse = await fetch(status_url);
  const statusData = await statusResponse.json();

  if (statusData.status === 'completed') {
    // Display results
    displayResults(statusData.results);
    return;
  } else if (statusData.status === 'failed') {
    // Show error
    showError(statusData.error);
    return;
  } else {
    // Still processing, poll again
    setTimeout(pollStatus, 2000);
  }
};

pollStatus();
```

## Performance Optimization

### Reduce Cold Starts
- **Premium Plan**: Always-warm instances
- **Pre-warmed DeltaE**: DataFrame loaded on startup, kept in memory
- **Connection Pooling**: Reuse Cosmos/Search clients across invocations

### Parallel Execution
- 4 parallel vector searches (base + 3 synonyms)
- 5 parallel LLM scoring calls (chunked)
- 2 parallel enrichments (flags + Lab diffs)

### Caching Opportunities
- **APIM response cache**: Cache status responses for 5 seconds (reduce Cosmos reads)
- **DeltaE results**: Cache Delta-E filter for same Lab values (30-minute TTL)
- **Synonym generation**: Cache synonyms per resin (1-hour TTL)

## Monitoring

### Key Metrics
1. **Accept Latency**: P95 < 500ms
2. **Queue Depth**: < 50 messages
3. **Orchestration Duration**: P95 < 30s
4. **Error Rate**: < 1%

### Application Insights Queries
```kusto
// Average orchestration duration
customEvents
| where name == "SearchOrchestrator"
| summarize avg(toint(customDimensions.duration_ms)) by bin(timestamp, 5m)

// Queue depth over time
customMetrics
| where name == "ServiceBus.QueueDepth"
| summarize max(value) by bin(timestamp, 1m)

// Error rate by status
requests
| where url endswith "/search"
| summarize errors = countif(resultCode != 202), total = count() by bin(timestamp, 5m)
| extend error_rate = errors * 100.0 / total
```

## Rollout Plan

### Week 1: Deploy Infrastructure
- Provision Service Bus queue
- Create Cosmos container `search-requests`
- Deploy Accept function (HTTP)
- Deploy Status function (HTTP)

### Week 2: Deploy Basic Orchestrator
- Deploy orchestrator with inline logic (single function)
- Test end-to-end flow with simple payload
- Verify Cosmos updates at each stage

### Week 3: Add Durable Activities
- Refactor to activity functions
- Add parallel search execution
- Test with real workload

### Week 4: Add LLM Scoring
- Implement chunk scoring activities
- Add enrichment activities
- Performance tuning

### Week 5: Production Cutover
- Blue-green deployment via APIM policy
- 10% → 50% → 100% traffic shift
- Monitor metrics and rollback if needed
