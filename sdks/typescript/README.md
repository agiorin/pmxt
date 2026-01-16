# pmxtjs - TypeScript SDK

> Unified prediction market data API - The ccxt for prediction markets

A TypeScript/JavaScript SDK for interacting with multiple prediction market exchanges (Polymarket, Kalshi) through a single, unified interface.

## Installation

```bash
npm install pmxtjs
```

## Quick Start

```typescript
import { Polymarket, Kalshi } from "pmxtjs";

// Initialize exchanges
const poly = new Polymarket();
const kalshi = new Kalshi();

// Search for markets
const markets = await poly.searchMarkets("Trump");
console.log(markets[0].title);

// Get historical data
const outcomeId = markets[0].outcomes[0].id;
const candles = await poly.fetchOHLCV(outcomeId, {
  resolution: "1h",
  limit: 100
});
```

## Features

- 🔄 **Unified API** - Same interface for all exchanges
- 📊 **Market Data** - Search, fetch markets, OHLCV candles, order books
- 💱 **Trading** - Create/cancel orders, manage positions (requires authentication)
- 🚀 **Auto-start Server** - Automatically starts the PMXT sidecar server
- 📦 **TypeScript** - Full type safety and IntelliSense support

## Architecture

pmxtjs uses a **"Sidecar" architecture**:

```
┌─────────────────┐
│  TypeScript SDK │
│    (pmxtjs)     │
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

The SDK communicates with a local Node.js server that handles the actual exchange interactions. This ensures consistency across all language SDKs.

## Usage

### Public Data (No Authentication)

```typescript
import { Polymarket } from "pmxtjs";

const poly = new Polymarket();

// Search markets
const markets = await poly.searchMarkets("Trump", { limit: 10 });

// Get markets by slug
const markets = await poly.getMarketsBySlug("who-will-trump-nominate-as-fed-chair");

// Fetch all markets
const allMarkets = await poly.fetchMarkets({ sort: "volume", limit: 20 });

// Get OHLCV data
const outcomeId = markets[0].outcomes[0].id;
const candles = await poly.fetchOHLCV(outcomeId, {
  resolution: "1h",
  limit: 100
});

// Get order book
const orderBook = await poly.fetchOrderBook(outcomeId);
console.log(`Best bid: ${orderBook.bids[0].price}`);
console.log(`Best ask: ${orderBook.asks[0].price}`);
```

### Trading (Requires Authentication)

#### Polymarket

```typescript
import { Polymarket } from "pmxtjs";

const poly = new Polymarket({
  privateKey: process.env.POLYMARKET_PRIVATE_KEY
});

// Get balance
const balance = await poly.fetchBalance();

// Create order
const order = await poly.createOrder({
  marketId: "663583",
  outcomeId: "10991849...",
  side: "buy",
  type: "limit",
  amount: 10,
  price: 0.55
});

// Get positions
const positions = await poly.fetchPositions();
```

#### Kalshi

```typescript
import { Kalshi } from "pmxtjs";

const kalshi = new Kalshi({
  apiKey: process.env.KALSHI_API_KEY,
  privateKey: process.env.KALSHI_PRIVATE_KEY
});

// Get balance
const balance = await kalshi.fetchBalance();

// Create order
const order = await kalshi.createOrder({
  marketId: "KXFEDCHAIRNOM-29",
  outcomeId: "KXFEDCHAIRNOM-29-Y",
  side: "buy",
  type: "limit",
  amount: 10,
  price: 0.55
});
```

## API Reference

### Exchange Methods

#### Market Data

- `fetchMarkets(params?)` - Get active markets
- `searchMarkets(query, params?)` - Search markets by keyword
- `getMarketsBySlug(slug)` - Get markets by URL slug/ticker
- `fetchOHLCV(outcomeId, params)` - Get historical price candles
- `fetchOrderBook(outcomeId)` - Get current order book
- `fetchTrades(outcomeId, params)` - Get trade history

#### Trading (requires authentication)

- `createOrder(params)` - Create a new order
- `cancelOrder(orderId)` - Cancel an open order
- `fetchOrder(orderId)` - Get order details
- `fetchOpenOrders(marketId?)` - Get all open orders

#### Account

- `fetchPositions()` - Get current positions
- `fetchBalance()` - Get account balance

### Data Types

See the [TypeScript definitions](./pmxt/models.ts) for complete type information.

## Server Management

The SDK automatically starts the PMXT sidecar server if it's not running. You can disable this:

```typescript
const poly = new Polymarket({ autoStartServer: false });
```

Or manually manage the server:

```typescript
import { ServerManager } from "pmxtjs";

const manager = new ServerManager();
await manager.ensureServerRunning();
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Clean build artifacts
npm run clean
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/qoery-com/pmxt)
- [Documentation](https://github.com/qoery-com/pmxt/tree/main/sdks)
- [API Reference](https://github.com/qoery-com/pmxt/blob/main/core/API_REFERENCE.md)
