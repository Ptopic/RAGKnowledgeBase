# Docling ETL Service - Docker Setup

Run Docling document processing service as a Docker container.

## Quick Start

### 1. Navigate to the Docker directory

```bash
cd backend/docker/docling
```

### 2. Build and run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the container in the background
- Expose port 5000
- Set up health checks
- Auto-restart on failures

### 3. Verify it's running

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:5000/health
# Should return: {"status":"ok"}
```

### 4. Update Backend .env

Add to your `backend/.env`:

```bash
DOCLING_API_URL=http://localhost:5000
DOCLING_TIMEOUT=300000
ETL_SERVICE=DOCLING
```

### 5. Restart your backend

```bash
cd ../..  # Back to backend directory
npm run start:dev
```

## Docker Commands

### Start the service
```bash
docker-compose up -d
```

### Stop the service
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild after changes
```bash
docker-compose up -d --build
```

### Check resource usage
```bash
docker stats docling-etl
```

## Alternative: Docker Run (without Compose)

### Build the image
```bash
docker build -t docling-etl .
```

### Run the container
```bash
docker run -d \
  --name docling-etl \
  -p 5000:5000 \
  --restart unless-stopped \
  docling-etl
```

### Stop and remove
```bash
docker stop docling-etl
docker rm docling-etl
```

## Testing the Service

### Test with a sample document

```bash
# Using curl
curl -X POST http://localhost:5000/convert \
  -F "file=@/path/to/document.pdf"

# Using httpie (if installed)
http -f POST http://localhost:5000/convert file@document.pdf
```

### Expected response

```json
{
  "document": {
    "markdown": "# Document Title\n\nDocument content...",
    "metadata": {
      "pages": 5,
      "title": "Document Title"
    }
  }
}
```

## Configuration

### Resource Limits

The docker-compose.yml includes resource limits:
- Max CPU: 2 cores
- Max Memory: 4GB
- Reserved CPU: 1 core
- Reserved Memory: 2GB

Adjust these in `docker-compose.yml` based on your system:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # Increase for better performance
      memory: 8G     # Increase for large documents
```

### Timeout Settings

For very large documents, you may need to increase timeouts:

**In docker-compose.yml:**
```yaml
environment:
  - GUNICORN_TIMEOUT=600  # 10 minutes
```

**In backend .env:**
```bash
DOCLING_TIMEOUT=600000  # 10 minutes
```

### Workers

Adjust the number of Gunicorn workers in `Dockerfile`:

```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "300", "docling_server:app"]
```

More workers = better concurrency but more memory usage.

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs docling
```

Common issues:
- Port 5000 already in use → Change port mapping in docker-compose.yml
- Out of memory → Increase Docker memory limit or reduce workers
- Build failures → Check Dockerfile for syntax errors

### Port already in use

Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5001:5000"  # Use port 5001 instead
```

Then update `.env`:
```bash
DOCLING_API_URL=http://localhost:5001
```

### Container keeps restarting

Check health status:
```bash
docker inspect docling-etl | grep -A 10 Health
```

If health checks fail, the issue might be:
- Docling dependencies not installed correctly
- Python errors in docling_server.py
- Port binding issues

### Out of memory errors

Increase Docker memory limits:

**Docker Desktop:**
- Settings → Resources → Memory → Increase to 8GB+

**docker-compose.yml:**
```yaml
deploy:
  resources:
    limits:
      memory: 8G
```

### Slow processing

Possible solutions:
1. Increase CPU/memory limits
2. Add more workers (but watch memory usage)
3. Use SSD for Docker storage
4. Process smaller batches

## Production Deployment

### Using Docker Swarm

```bash
docker stack deploy -c docker-compose.yml docling
```

### Using Kubernetes

Create a deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: docling-etl
spec:
  replicas: 2
  selector:
    matchLabels:
      app: docling-etl
  template:
    metadata:
      labels:
        app: docling-etl
    spec:
      containers:
      - name: docling
        image: docling-etl:latest
        ports:
        - containerPort: 5000
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
          requests:
            cpu: "1"
            memory: "2Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: docling-etl
spec:
  selector:
    app: docling-etl
  ports:
  - port: 5000
    targetPort: 5000
```

### Environment Variables

For production, consider:
```yaml
environment:
  - PYTHONUNBUFFERED=1
  - LOG_LEVEL=INFO
  - WORKERS=4
  - TIMEOUT=300
```

## Monitoring

### View real-time logs
```bash
docker-compose logs -f docling
```

### Check health
```bash
curl http://localhost:5000/health
```

### Monitor resources
```bash
docker stats docling-etl
```

### Metrics (Advanced)

Add Prometheus metrics by modifying `docling_server.py`:

```python
from prometheus_flask_exporter import PrometheusMetrics

app = Flask(__name__)
metrics = PrometheusMetrics(app)
```

## Integration with Backend

Once running, your NestJS backend will automatically connect to Docling when:

1. A file is uploaded via the API
2. The file type is supported (PDF, DOCX, etc.)
3. `ETL_SERVICE=DOCLING` is set in `.env`

The backend will:
- Send the file to Docling for conversion
- Receive markdown output
- Process and store in database
- Create searchable chunks with embeddings

## Cleanup

### Remove containers and images
```bash
docker-compose down --rmi all

# Or just the container
docker-compose down
```

### Remove volumes (if any)
```bash
docker-compose down -v
```

## Support

For issues:
1. Check container logs: `docker-compose logs docling`
2. Verify health: `curl http://localhost:5000/health`
3. Test with simple PDF first
4. Check Docker resources are sufficient
5. Review backend logs for connection errors
