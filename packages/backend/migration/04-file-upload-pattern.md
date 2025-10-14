# File Upload Pattern - Blob Storage Integration

## Overview
Implement a cloud-native file upload pattern for Lab CSV data and future feedback attachments. Files are uploaded directly to Azure Blob Storage, with metadata tracked in Cosmos DB. A function validates and processes uploaded files asynchronously.

## Use Cases
1. **Lab Data Upload**: Admin uploads updated MTL_Lab.csv file
2. **Feedback Attachments** (Future): Users attach screenshots to feedback

---

## Pattern: Upload → Blob → Trigger → Validate → Register

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /upload-lab-data
     │ (multipart/form-data with CSV file)
     ▼
┌─────────────────────────────────────┐
│ Function: LabDataUploadAccept       │
│ (HTTP Trigger)                      │
│                                     │
│ 1. Validate file (size, type)      │
│ 2. Generate unique blob name       │
│ 3. Upload to Blob Storage          │
│ 4. Write metadata to Cosmos        │
│ 5. Return upload_id immediately    │
│                                     │
│ Duration: < 2s                      │
└────────────┬────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │ Blob Storage  │
     │ Container:    │
     │ lab-data      │
     └───────┬───────┘
             │
             │ (Blob Created Event)
             ▼
┌─────────────────────────────────────┐
│ Function: LabDataValidator          │
│ (Blob Trigger)                      │
│                                     │
│ 1. Download blob                    │
│ 2. Parse CSV                        │
│ 3. Validate schema                  │
│ 4. Count rows                       │
│ 5. Check for duplicates             │
│ 6. Update Cosmos metadata           │
│ 7. Set status (active/invalid)      │
│                                     │
│ Duration: 2-10s                     │
└─────────────────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │   Cosmos DB   │
     │ Container:    │
     │ lab-data-     │
     │ registry      │
     └───────────────┘
```

---

## Component 1: Upload Accept Function

### Function Code
```python
import azure.functions as func
import json
import uuid
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
from azure.cosmos import CosmosClient

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def main(req: func.HttpRequest, blob_service: BlobServiceClient, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Accept file upload and store in Blob Storage.
    """
    try:
        # Get uploaded file
        file = req.files.get('file')
        if not file:
            return func.HttpResponse(
                json.dumps({"error": "No file provided. Use multipart/form-data with 'file' field."}),
                status_code=400,
                mimetype='application/json'
            )

        # Validate file type
        filename = file.filename
        if not filename.endswith('.csv'):
            return func.HttpResponse(
                json.dumps({"error": "Only CSV files are supported"}),
                status_code=400,
                mimetype='application/json'
            )

        # Read file content
        file_content = file.read()
        file_size = len(file_content)

        # Validate file size
        if file_size > MAX_FILE_SIZE:
            return func.HttpResponse(
                json.dumps({"error": f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024)} MB"}),
                status_code=413,
                mimetype='application/json'
            )

        if file_size == 0:
            return func.HttpResponse(
                json.dumps({"error": "File is empty"}),
                status_code=400,
                mimetype='application/json'
            )

        # Extract metadata
        uploaded_by = req.headers.get('user-id', 'unknown')

        # Generate unique blob name
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        upload_id = f"upload_{timestamp}_{uuid.uuid4().hex[:8]}"
        blob_name = f"MTL_Lab_{timestamp}.csv"

        # Upload to Blob Storage
        container_client = blob_service.get_container_client("lab-data")
        blob_client = container_client.get_blob_client(blob_name)

        blob_client.upload_blob(
            file_content,
            overwrite=False,
            metadata={
                "uploaded_by": uploaded_by,
                "original_filename": filename,
                "upload_id": upload_id
            }
        )

        blob_url = blob_client.url

        # Create metadata record in Cosmos
        now = datetime.now(timezone.utc).isoformat()
        metadata_doc = {
            "id": upload_id,
            "upload_id": upload_id,
            "blob_url": blob_url,
            "blob_name": blob_name,
            "original_filename": filename,
            "uploaded_by": uploaded_by,
            "uploaded_at": now,
            "file_size_bytes": file_size,
            "status": "validating",  # Will be updated by validator function
            "validation": None,
            "row_count": None,
            "ttl": -1  # Never expire
        }

        container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")
        container.create_item(metadata_doc)

        # Return response
        response = {
            "upload_id": upload_id,
            "blob_url": blob_url,
            "status": "validating",
            "message": "File uploaded successfully. Validation in progress.",
            "status_url": f"/lab-data-status/{upload_id}"
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=202,  # Accepted
            mimetype='application/json'
        )

    except Exception as e:
        logging.error(f"File upload failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "File upload failed"}),
            status_code=500,
            mimetype='application/json'
        )
```

### Bindings (function.json)
```json
{
  "scriptFile": "lab_data_upload.py",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "upload-lab-data"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

### APIM Policy (Admin Only)
```xml
<policies>
  <inbound>
    <base />
    <!-- Restrict to admin role -->
    <validate-jwt header-name="Authorization" failed-validation-httpcode="403">
      <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration" />
      <required-claims>
        <claim name="roles" match="any">
          <value>Admin</value>
        </claim>
      </required-claims>
    </validate-jwt>

    <!-- Enforce file size limit at gateway level -->
    <set-header name="Content-Length-Limit" exists-action="override">
      <value>52428800</value>
    </set-header>
  </inbound>
</policies>
```

---

## Component 2: Blob Validator Function

### Function Code
```python
import azure.functions as func
import pandas as pd
import io
import logging
from azure.cosmos import CosmosClient
from azure.storage.blob import BlobServiceClient

REQUIRED_COLUMNS = ['Material', 'L*', 'a*', 'b*']

def main(blob: func.InputStream, cosmos_client: CosmosClient):
    """
    Triggered when new blob is uploaded. Validates CSV and updates metadata.
    """
    blob_name = blob.name.split('/')[-1]  # Extract filename from path
    logging.info(f"Validating blob: {blob_name}")

    try:
        # Parse CSV
        csv_data = blob.read()
        df = pd.read_csv(io.BytesIO(csv_data))

        # Validation results
        validation = {
            "columns_found": list(df.columns),
            "missing_columns": [],
            "null_values_count": 0,
            "duplicate_materials_count": 0,
            "errors": []
        }

        # Check required columns
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            validation["missing_columns"] = missing_cols
            validation["errors"].append(f"Missing required columns: {missing_cols}")

        # Check for null values
        null_count = df[REQUIRED_COLUMNS].isnull().sum().sum() if not missing_cols else 0
        validation["null_values_count"] = int(null_count)
        if null_count > 0:
            validation["errors"].append(f"Found {null_count} null values in required columns")

        # Check for duplicate materials
        if 'Material' in df.columns:
            duplicate_count = df['Material'].duplicated().sum()
            validation["duplicate_materials_count"] = int(duplicate_count)
            if duplicate_count > 0:
                validation["errors"].append(f"Found {duplicate_count} duplicate material IDs")

        # Determine status
        row_count = len(df)
        status = "active" if not validation["errors"] else "invalid"

        # Find upload_id from blob metadata
        blob_client = BlobServiceClient.from_connection_string(
            os.getenv('AzureWebJobsStorage')
        ).get_blob_client("lab-data", blob_name)
        blob_metadata = blob_client.get_blob_properties().metadata
        upload_id = blob_metadata.get('upload_id')

        if not upload_id:
            logging.error(f"No upload_id in blob metadata for {blob_name}")
            return

        # Update Cosmos record
        container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")
        doc = container.read_item(item=upload_id, partition_key=upload_id)

        doc['status'] = status
        doc['row_count'] = row_count
        doc['validation'] = validation

        container.upsert_item(doc)

        logging.info(f"Validation complete for {blob_name}: status={status}, rows={row_count}")

    except Exception as e:
        logging.error(f"Validation failed for {blob_name}: {e}")

        # Try to update Cosmos with error
        try:
            blob_client = BlobServiceClient.from_connection_string(
                os.getenv('AzureWebJobsStorage')
            ).get_blob_client("lab-data", blob_name)
            blob_metadata = blob_client.get_blob_properties().metadata
            upload_id = blob_metadata.get('upload_id')

            if upload_id:
                container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")
                doc = container.read_item(item=upload_id, partition_key=upload_id)
                doc['status'] = 'invalid'
                doc['validation'] = {"errors": [str(e)]}
                container.upsert_item(doc)
        except:
            pass  # Best effort
```

### Bindings (function.json)
```json
{
  "scriptFile": "lab_data_validator.py",
  "bindings": [
    {
      "name": "blob",
      "type": "blobTrigger",
      "direction": "in",
      "path": "lab-data/{name}",
      "connection": "AzureWebJobsStorage"
    }
  ]
}
```

---

## Component 3: Status Endpoint

### Function Code
```python
import azure.functions as func
import json
from azure.cosmos import CosmosClient

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Get status of file upload and validation.
    """
    upload_id = req.route_params.get('upload_id')

    if not upload_id:
        return func.HttpResponse(
            json.dumps({"error": "upload_id required"}),
            status_code=400,
            mimetype='application/json'
        )

    try:
        # Read from Cosmos
        container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")
        doc = container.read_item(item=upload_id, partition_key=upload_id)

        # Build response
        response = {
            "upload_id": doc['upload_id'],
            "blob_url": doc['blob_url'],
            "original_filename": doc['original_filename'],
            "uploaded_by": doc['uploaded_by'],
            "uploaded_at": doc['uploaded_at'],
            "file_size_bytes": doc['file_size_bytes'],
            "status": doc['status'],
            "row_count": doc.get('row_count'),
            "validation": doc.get('validation')
        }

        status_code = 200 if doc['status'] == 'active' else 202 if doc['status'] == 'validating' else 400

        return func.HttpResponse(
            json.dumps(response),
            status_code=status_code,
            mimetype='application/json'
        )

    except Exception as e:
        logging.error(f"Status lookup failed for {upload_id}: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Upload not found"}),
            status_code=404,
            mimetype='application/json'
        )
```

### Bindings (function.json)
```json
{
  "scriptFile": "lab_data_status.py",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"],
      "route": "lab-data-status/{upload_id}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

---

## Component 4: List Uploads Endpoint

### Function Code
```python
import azure.functions as func
import json
from azure.cosmos import CosmosClient

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    List all Lab data uploads with optional status filter.
    """
    try:
        # Query parameters
        status = req.params.get('status')  # active, invalid, validating
        limit = min(int(req.params.get('limit', 10)), 100)

        # Build query
        container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")

        if status:
            query = "SELECT * FROM c WHERE c.status = @status ORDER BY c.uploaded_at DESC OFFSET 0 LIMIT @limit"
            params = [
                {"name": "@status", "value": status},
                {"name": "@limit", "value": limit}
            ]
        else:
            query = "SELECT * FROM c ORDER BY c.uploaded_at DESC OFFSET 0 LIMIT @limit"
            params = [{"name": "@limit", "value": limit}]

        items = list(container.query_items(
            query=query,
            parameters=params,
            enable_cross_partition_query=True
        ))

        response = {
            "uploads": items,
            "count": len(items)
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype='application/json'
        )

    except Exception as e:
        logging.error(f"List uploads failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Failed to list uploads"}),
            status_code=500,
            mimetype='application/json'
        )
```

---

## Component 5: Activate Upload Endpoint

### Function Code
```python
import azure.functions as func
import json
from azure.cosmos import CosmosClient
from datetime import datetime, timezone

def main(req: func.HttpRequest, cosmos_client: CosmosClient) -> func.HttpResponse:
    """
    Set a validated upload as the active Lab data source.
    Marks previous active uploads as inactive.
    """
    try:
        payload = req.get_json()
        upload_id = payload.get('upload_id')

        if not upload_id:
            return func.HttpResponse(
                json.dumps({"error": "upload_id required"}),
                status_code=400,
                mimetype='application/json'
            )

        container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")

        # Verify upload exists and is valid
        target_doc = container.read_item(item=upload_id, partition_key=upload_id)

        if target_doc['status'] != 'active':
            return func.HttpResponse(
                json.dumps({"error": "Upload must have status 'active' to be activated"}),
                status_code=400,
                mimetype='application/json'
            )

        # Mark all other uploads as inactive
        query = "SELECT * FROM c WHERE c.status = 'active' AND c.id != @upload_id"
        params = [{"name": "@upload_id", "value": upload_id}]
        active_uploads = list(container.query_items(query=query, parameters=params, enable_cross_partition_query=True))

        for doc in active_uploads:
            doc['status'] = 'inactive'
            doc['deactivated_at'] = datetime.now(timezone.utc).isoformat()
            container.upsert_item(doc)

        # Mark target as active (add flag if needed)
        target_doc['is_current'] = True
        target_doc['activated_at'] = datetime.now(timezone.utc).isoformat()
        container.upsert_item(target_doc)

        return func.HttpResponse(
            json.dumps({
                "upload_id": upload_id,
                "status": "active",
                "message": f"Upload {upload_id} is now the active Lab data source"
            }),
            status_code=200,
            mimetype='application/json'
        )

    except Exception as e:
        logging.error(f"Activate upload failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Failed to activate upload"}),
            status_code=500,
            mimetype='application/json'
        )
```

---

## Integration with DeltaE Service

### Modified DeltaE Function
```python
import pandas as pd
import numpy as np
from skimage import color
from azure.storage.blob import BlobServiceClient
from azure.cosmos import CosmosClient
import io

# Global cache
_CACHED_LAB_DATA = None
_CACHED_UPLOAD_ID = None

def load_active_lab_data(cosmos_client: CosmosClient, blob_service: BlobServiceClient):
    """
    Load Lab data from currently active upload.
    Caches in memory to avoid repeated downloads.
    """
    global _CACHED_LAB_DATA, _CACHED_UPLOAD_ID

    # Find active upload
    container = cosmos_client.get_database_client("colorai").get_container_client("lab-data-registry")
    query = "SELECT TOP 1 * FROM c WHERE c.is_current = true ORDER BY c.activated_at DESC"
    active_uploads = list(container.query_items(query=query, enable_cross_partition_query=True))

    if not active_uploads:
        raise RuntimeError("No active Lab data upload found")

    active_upload = active_uploads[0]
    upload_id = active_upload['upload_id']

    # Check cache
    if _CACHED_UPLOAD_ID == upload_id and _CACHED_LAB_DATA is not None:
        return _CACHED_LAB_DATA

    # Download from blob
    blob_name = active_upload['blob_name']
    blob_client = blob_service.get_blob_client("lab-data", blob_name)
    csv_data = blob_client.download_blob().readall()

    # Parse CSV
    df = pd.read_csv(io.BytesIO(csv_data))

    # Cache
    _CACHED_LAB_DATA = df
    _CACHED_UPLOAD_ID = upload_id

    logging.info(f"Loaded Lab data from upload {upload_id}: {len(df)} rows")
    return df

def deltae_filtering_activity(activity_input: dict) -> str:
    """Updated DeltaE activity using dynamic Lab data"""
    cosmos_client = get_cosmos_client()
    blob_service = get_blob_service_client()

    # Load active Lab data
    df = load_active_lab_data(cosmos_client, blob_service)

    # Extract inputs
    L = activity_input['L']
    a = activity_input['a']
    b = activity_input['b']
    threshold = activity_input['threshold']

    # Vectorized Delta-E CMC calculation
    target = np.array([[L, a, b]])
    lab_array = df[['L*', 'a*', 'b*']].to_numpy()
    deltaEs = color.deltaE_cmc(lab_array, target, kL=2, kC=1)

    # Filter materials within threshold
    matches = df[deltaEs <= threshold]['Material'].tolist()

    if matches:
        values_str = ",".join(matches)
        return f"search.in(id, '{values_str}', ',')"
    else:
        return None
```

---

## Frontend Client Example

### Upload Flow
```javascript
// 1. Select file
const fileInput = document.getElementById('lab-file-input');
const file = fileInput.files[0];

// 2. Upload file
const formData = new FormData();
formData.append('file', file);

const uploadResponse = await fetch('/upload-lab-data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'user-id': 'admin@avient.com'
  },
  body: formData
});

const { upload_id, status_url } = await uploadResponse.json();

// 3. Poll status
const pollStatus = async () => {
  const statusResponse = await fetch(status_url);
  const statusData = await statusResponse.json();

  if (statusData.status === 'active') {
    console.log('Validation passed!', statusData.row_count, 'rows');
    // Enable "Activate" button
  } else if (statusData.status === 'invalid') {
    console.error('Validation failed:', statusData.validation.errors);
  } else {
    // Still validating
    setTimeout(pollStatus, 2000);
  }
};

pollStatus();

// 4. Activate upload (admin action)
await fetch('/activate-lab-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ upload_id })
});
```

---

## Testing

### Upload Test
```bash
curl -X POST https://api.colorai.com/upload-lab-data \
  -H "Authorization: Bearer $TOKEN" \
  -H "user-id: admin@avient.com" \
  -F "file=@MTL_Lab_test.csv"

# Expected: 202 Accepted with upload_id
```

### Status Test
```bash
curl -X GET https://api.colorai.com/lab-data-status/upload_20251010_142000 \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with validation results
```

### List Uploads Test
```bash
curl -X GET "https://api.colorai.com/list-lab-uploads?status=active&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with list of uploads
```

---

## Monitoring

### Key Metrics
1. **Upload Success Rate**: % of uploads that pass validation
2. **Validation Duration**: Time from upload to validation complete
3. **Blob Storage Size**: Total size of lab-data container
4. **Active Upload Age**: Days since current active upload

### Application Insights Queries
```kusto
// Upload success rate
customEvents
| where name == "LabDataValidation"
| extend status = tostring(customDimensions.status)
| summarize success = countif(status == "active"), total = count() by bin(timestamp, 1d)
| extend success_rate = success * 100.0 / total
```

---

## Security Considerations

1. **Admin-Only**: Upload endpoint restricted to Admin role via APIM policy
2. **Blob SAS Tokens**: Generate short-lived SAS tokens for download if needed
3. **Virus Scanning**: Consider Azure Defender for Storage malware scanning
4. **Audit Trail**: All uploads logged with user_id in Cosmos

---

## Future Enhancements

1. **Versioning**: Keep history of Lab data versions
2. **Rollback**: Ability to revert to previous active upload
3. **Diff View**: Show changes between versions
4. **Scheduled Refresh**: Auto-fetch Lab data from source system
5. **Multi-File Support**: Upload related files (specs, documentation)
6. **Feedback Attachments**: Apply same pattern for user-uploaded screenshots
