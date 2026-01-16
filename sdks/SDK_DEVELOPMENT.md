# SDK Development Guide

This document explains how the PMXT SDK generation works and how to maintain it.

## Architecture

PMXT uses a **"Sidecar" architecture** for multi-language support:

```
┌─────────────────┐
│  Language Client│
│   (pmxt SDK)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Node.js Server │ ◄── The "Sidecar"
│   (pmxt-server) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Polymarket│ │Kalshi│
└────────┘ └────────┘
```

### Why This Approach?

1. **Single Source of Truth**: The Node.js implementation is the canonical version
2. **Consistency**: All languages get identical behavior
3. **Rapid Iteration**: Update the server, all SDKs update automatically
4. **Quality**: We can write the core logic once, in TypeScript, with full testing

## Directory Structure

```
sdks/
└── python/
    ├── pmxt/                    # Human-written wrapper (EDIT THIS)
    │   ├── __init__.py
    │   ├── client.py           # Main Exchange classes
    │   └── models.py           # Clean dataclasses
    ├── generated/               # Auto-generated (DO NOT EDIT)
    │   └── pmxt_internal/      # Raw OpenAPI client
    ├── examples/
    │   └── basic_usage.py
    ├── pyproject.toml
    └── README.md
```

### The Golden Rule

**NEVER manually edit files in `generated/`**. They will be overwritten.

All human code goes in `pmxt/` (the wrapper).

## Generating SDKs

### Python

```bash
# Generate the raw OpenAPI client
npm run generate:sdk:python

# Or manually:
npx @openapitools/openapi-generator-cli generate \
  -i src/server/openapi.yaml \
  -g python \
  -o sdks/python/generated \
  --package-name pmxt_internal \
  --additional-properties=projectName=pmxt-internal,packageVersion=0.4.4,library=urllib3
```

This creates the "ugly" auto-generated client in `sdks/python/generated/pmxt_internal/`.

The human wrapper in `sdks/python/pmxt/` imports this and provides a clean API.

### Future Languages

When adding Go, Java, etc.:

```bash
# Go
npm run generate:sdk:go

# Java
npm run generate:sdk:java
```

Each will follow the same pattern:
- `sdks/{language}/generated/` - Auto-generated client
- `sdks/{language}/pmxt/` - Human wrapper

## The Human Wrapper Pattern

The wrapper does three things:

### 1. Clean Imports

```python
# User writes:
import pmxt
poly = pmxt.Polymarket()

# Not:
from pmxt_internal.api.default_api import DefaultApi
from pmxt_internal.configuration import Configuration
# ... etc
```

### 2. Pythonic API

```python
# User writes:
markets = poly.search_markets("Trump", MarketFilterParams(limit=10))

# Not:
request = SearchMarketsRequest(args=["Trump", {"limit": 10}])
response = api.search_markets(exchange="polymarket", search_markets_request=request)
data = response.to_dict()["data"]
```

### 3. Clean Data Models

```python
# User gets:
@dataclass
class UnifiedMarket:
    id: str
    title: str
    outcomes: List[MarketOutcome]
    # ...

# Not:
class UnifiedMarket(BaseModel):
    def __init__(self, id=None, title=None, outcomes=None, ...):
        # 100 lines of generated code
```

## Maintaining the Wrapper

When you add a new endpoint to the OpenAPI spec:

1. **Update `src/server/openapi.yaml`** with the new endpoint
2. **Regenerate**: `npm run generate:sdk:python`
3. **Update the wrapper**:
   - Add the method to `pmxt/client.py`
   - Add any new models to `pmxt/models.py`
   - Add a converter function if needed

Example:

```python
# In pmxt/client.py
def fetch_new_thing(self, thing_id: str) -> NewThing:
    """Fetch a new thing."""
    try:
        request_body = {"args": [thing_id]}
        
        response = self._api.fetch_new_thing(
            exchange=self.exchange_name,
            fetch_new_thing_request=request_body,
        )
        
        data = self._handle_response(response.to_dict())
        return _convert_new_thing(data)
    except ApiException as e:
        raise Exception(f"Failed to fetch new thing: {e}")
```

## Testing

```bash
cd sdks/python

# Install in development mode
pip install -e ".[dev]"

# Run the example (requires server running)
python examples/basic_usage.py
```

## Publishing

### Python (PyPI)

```bash
cd sdks/python

# Build
python -m build

# Upload to PyPI
python -m twine upload dist/*
```

### Version Bumping

When releasing a new version:

1. Update `package.json` version
2. Update `sdks/python/pyproject.toml` version
3. Regenerate SDKs: `npm run generate:sdk:all`
4. Commit and tag: `git tag v0.4.5`

## Common Issues

### "Module not found: pmxt_internal"

The generated client isn't in the Python path. The wrapper adds it dynamically:

```python
# In pmxt/client.py
_GENERATED_PATH = os.path.join(os.path.dirname(__file__), "..", "generated")
sys.path.insert(0, _GENERATED_PATH)
```

### "OpenAPI validation error"

Your `openapi.yaml` has a schema issue. Common problems:

- Empty arrays without `items: {}`
- Missing required fields
- Invalid enum values

Run the generator with `--skip-validate-spec` to see the raw error.

### "Server not running"

The Python SDK requires the sidecar server:

```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Run Python code
python examples/basic_usage.py
```

## Future: Native Bindings (v2.0.0)

Eventually, we'll move to native bindings (Rust + FFI) to eliminate the sidecar dependency. But for v1.0.0, the sidecar approach lets us move fast and support many languages with minimal effort.

## Questions?

See the main [ROADMAP.md](../../ROADMAP.md) for the overall project vision.
