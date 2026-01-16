# PMXT Python SDK

A unified Python interface for interacting with multiple prediction market exchanges (Kalshi, Polymarket).

> **Note**: This SDK requires the PMXT sidecar server to be running. See [Installation](#installation) below.

## Installation

```bash
pip install pmxt
```

## Quick Start

### 1. Start the PMXT Sidecar Server

The Python SDK communicates with a local Node.js server that handles the exchange integrations:

```bash
# Install the server (one-time)
npm install -g pmxtjs

# Start the server
pmxt-server
```

The server will run on `http://localhost:3847` by default.

### 2. Use the Python SDK

```python
import pmxt

# Initialize exchanges
poly = pmxt.Polymarket()
kalshi = pmxt.Kalshi()

# Search for markets
markets = poly.search_markets("Trump")
print(markets[0].title)

# Get outcome details
outcome = markets[0].outcomes[0]
print(f"{outcome.label}: {outcome.price * 100:.1f}%")

# Fetch historical data (use outcome.id!)
candles = poly.fetch_ohlcv(
    outcome.id,
    pmxt.HistoryFilterParams(resolution="1d", limit=30)
)

# Get current order book
order_book = poly.fetch_order_book(outcome.id)
spread = order_book.asks[0].price - order_book.bids[0].price
print(f"Spread: {spread * 100:.2f}%")
```

## Authentication (for Trading)

### Polymarket

Requires your **Polygon Private Key**:

```python
import os
import pmxt

poly = pmxt.Polymarket(
    private_key=os.getenv("POLYMARKET_PRIVATE_KEY")
)

# Check balance
balances = poly.fetch_balance()
print(f"Available: ${balances[0].available}")

# Place order
order = poly.create_order(pmxt.CreateOrderParams(
    market_id="663583",
    outcome_id="10991849...",
    side="buy",
    type="limit",
    amount=10,
    price=0.55
))
```

### Kalshi

Requires **API Key** and **Private Key**:

```python
import os
import pmxt

kalshi = pmxt.Kalshi(
    api_key=os.getenv("KALSHI_API_KEY"),
    private_key=os.getenv("KALSHI_PRIVATE_KEY")
)

# Check positions
positions = kalshi.fetch_positions()
for pos in positions:
    print(f"{pos.outcome_label}: ${pos.unrealized_pnl:.2f}")
```

## API Reference

### Market Data Methods

- `fetch_markets(params?)` - Get active markets
- `search_markets(query, params?)` - Search markets by keyword
- `get_markets_by_slug(slug)` - Get market by URL slug/ticker
- `fetch_ohlcv(outcome_id, params)` - Get historical price candles
- `fetch_order_book(outcome_id)` - Get current order book
- `fetch_trades(outcome_id, params)` - Get trade history

### Trading Methods (require authentication)

- `create_order(params)` - Place a new order
- `cancel_order(order_id)` - Cancel an open order
- `fetch_order(order_id)` - Get order details
- `fetch_open_orders(market_id?)` - Get all open orders

### Account Methods (require authentication)

- `fetch_balance()` - Get account balance
- `fetch_positions()` - Get current positions

## Data Models

All methods return clean Python dataclasses:

```python
@dataclass
class UnifiedMarket:
    id: str
    title: str
    outcomes: List[MarketOutcome]
    volume_24h: float
    liquidity: float
    url: str
    # ... more fields

@dataclass
class MarketOutcome:
    id: str              # Use this for fetch_ohlcv/fetch_order_book
    label: str           # "Trump", "Yes", etc.
    price: float         # 0.0 to 1.0 (probability)
    # ... more fields
```

See the [full API reference](../../API_REFERENCE.md) for complete documentation.

## Important Notes

### Use `outcome.id`, not `market.id`

For deep-dive methods like `fetch_ohlcv()`, `fetch_order_book()`, and `fetch_trades()`, you must use the **outcome ID**, not the market ID:

```python
markets = poly.search_markets("Trump")
outcome_id = markets[0].outcomes[0].id  # ✅ Correct

candles = poly.fetch_ohlcv(outcome_id, ...)  # ✅ Works
candles = poly.fetch_ohlcv(markets[0].id, ...)  # ❌ Wrong!
```

### Prices are 0.0 to 1.0

All prices represent probabilities (0.0 to 1.0). Multiply by 100 for percentages:

```python
outcome = markets[0].outcomes[0]
print(f"Price: {outcome.price * 100:.1f}%")  # "Price: 55.3%"
```

### Timestamps are Unix milliseconds

```python
from datetime import datetime

candle = candles[0]
dt = datetime.fromtimestamp(candle.timestamp / 1000)
print(dt)
```

## Development

```bash
# Clone the repo
git clone https://github.com/qoery-com/pmxt.git
cd pmxt/sdks/python

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest
```

## License

MIT
