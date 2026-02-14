# Adding a New Exchange

This guide walks through every file and registration point required to add a new prediction market exchange to pmxt.

## Overview

An exchange implementation lives in `core/src/exchanges/<name>/` and consists of these files:

| File | Purpose |
|------|---------|
| `utils.ts` | API URLs, status mapping, `mapMarketToUnified()` helper |
| `errors.ts` | Exchange-specific error patterns extending `ErrorMapper` |
| `fetchMarkets.ts` | Fetch and normalize markets to `UnifiedMarket[]` |
| `fetchEvents.ts` | Fetch and normalize events to `UnifiedEvent[]` |
| `fetchOHLCV.ts` | Historical candle data mapped to `PriceCandle[]` |
| `fetchOrderBook.ts` | Current order book mapped to `OrderBook` |
| `fetchTrades.ts` | Trade history mapped to `Trade[]` |
| `auth.ts` | Credential validation, header/signer generation |
| `websocket.ts` | Real-time streaming (`watchOrderBook`, `watchTrades`, `close`) |
| `index.ts` | Main class extending `PredictionMarketExchange`, wiring everything together |

All methods are **required**. See the compliance matrix in `core/COMPLIANCE.md` for the full list.

## Reference Implementations

- **Kalshi** (`core/src/exchanges/kalshi/`) -- simplest, REST-based authentication (RSA-PSS signing), good starting point
- **Polymarket** (`core/src/exchanges/polymarket/`) -- most complete, CLOB with L1/L2 auth, separate `fetchPositions.ts`

Read through Kalshi first to understand the pattern, then reference Polymarket for more advanced cases.

## Step-by-Step Walkthrough

### 1. Create the exchange directory

```
core/src/exchanges/<name>/
```

### 2. `utils.ts` -- API constants and mapping helpers

Define:
- Base API URL constants (REST, WebSocket)
- Status mapping functions (exchange-native statuses to unified statuses)
- `mapMarketToUnified()` -- converts a raw API market object into a `UnifiedMarket`

```typescript
// Example structure
export const BASE_URL = 'https://api.example.com';
export const WS_URL = 'wss://ws.example.com';

export function mapMarketToUnified(raw: any): UnifiedMarket {
    return {
        marketId: raw.id,
        title: raw.name,
        description: raw.description,
        outcomes: raw.outcomes.map(mapOutcome),
        resolutionDate: new Date(raw.end_date),
        volume24h: raw.volume_24h,
        liquidity: raw.liquidity,
        url: `https://example.com/markets/${raw.slug}`,
    };
}
```

See `kalshi/utils.ts` or `polymarket/utils.ts` for complete examples.

### 3. `errors.ts` -- Exchange-specific error mapping

Extend `ErrorMapper` from `core/src/utils/error-mapper.ts` with patterns specific to this exchange's API error responses.

```typescript
import { ErrorMapper } from '../../utils/error-mapper';

export const exampleErrorMapper = new ErrorMapper('Example');
```

If the exchange has unique error formats, override `mapBadRequestError` or `mapNotFoundError` in a subclass. See `polymarket/errors.ts` for an example with custom patterns.

### 4. `fetchMarkets.ts` -- Market data

Fetch all active markets from the exchange API and return `UnifiedMarket[]`.

- Handle pagination if the API paginates
- Use `mapMarketToUnified()` from your `utils.ts`
- Support the `MarketFetchParams` / `MarketFilterParams` interface for filtering

### 5. `fetchEvents.ts` -- Event data

Fetch events (groups of related markets) and return `UnifiedEvent[]`.

- Each event contains a `markets: UnifiedMarket[]` array
- Support `EventFetchParams` for filtering

### 6. `fetchOHLCV.ts` -- Historical candle data

Fetch price history for a given market ID and return `PriceCandle[]`.

```typescript
interface PriceCandle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
```

- Support the `CandleInterval` type: `'1m' | '5m' | '15m' | '1h' | '6h' | '1d'`
- Map the exchange's native interval format to the unified one

### 7. `fetchOrderBook.ts` -- Order book

Fetch the current order book for a market and return `OrderBook`.

```typescript
interface OrderBook {
    bids: OrderLevel[];  // sorted descending by price
    asks: OrderLevel[];  // sorted ascending by price
    timestamp?: number;
}
```

- Prices should be in the 0.0-1.0 probability range
- Convert from cents or other formats as needed

### 8. `fetchTrades.ts` -- Trade history

Fetch recent trades for a market and return `Trade[]`.

```typescript
interface Trade {
    id: string;
    timestamp: number;
    price: number;
    amount: number;
    side: 'buy' | 'sell' | 'unknown';
}
```

### 9. `auth.ts` -- Authentication

Handle credential validation and request signing. The structure depends on the exchange's auth mechanism:

- **API key + signature** (like Kalshi): Validate credentials on construction, provide a `getHeaders(method, path)` method
- **Wallet-based** (like Polymarket): Handle key derivation, L1/L2 auth flows

```typescript
export class ExampleAuth {
    private credentials: ExchangeCredentials;

    constructor(credentials: ExchangeCredentials) {
        this.credentials = credentials;
        this.validateCredentials();
    }

    private validateCredentials() {
        if (!this.credentials.apiKey) {
            throw new Error('Example requires an apiKey for authentication');
        }
    }

    getHeaders(method: string, path: string): Record<string, string> {
        // Generate auth headers for the request
    }
}
```

### 10. Trading methods in `index.ts`

Your main exchange class must implement all trading methods:

| Method | Signature | Returns |
|--------|-----------|---------|
| `createOrder` | `(params: CreateOrderParams)` | `Promise<Order>` |
| `cancelOrder` | `(orderId: string)` | `Promise<Order>` |
| `fetchOrder` | `(orderId: string)` | `Promise<Order>` |
| `fetchOpenOrders` | `(marketId?: string)` | `Promise<Order[]>` |
| `fetchPositions` | `()` | `Promise<Position[]>` |
| `fetchBalance` | `()` | `Promise<Balance[]>` |

- Authenticated methods should call `ensureAuth()` before making API calls
- Map all responses to unified types defined in `core/src/types.ts`

### 11. `websocket.ts` -- Real-time data

Implement WebSocket streaming following the CCXT Pro async pattern:

```typescript
export class ExampleWebSocket {
    async watchOrderBook(id: string): Promise<OrderBook> {
        // Returns a promise that resolves on the next orderbook update
    }

    async watchTrades(id: string): Promise<Trade[]> {
        // Returns a promise that resolves on the next batch of trades
    }

    async close(): Promise<void> {
        // Clean up connection and reject pending promises
    }
}
```

Key implementation details:
- Maintain promise queues per subscription (resolvers are stored, then resolved when data arrives)
- Cache the latest order book state and apply deltas
- Handle reconnection automatically
- Track subscriptions to resubscribe on reconnect

See `kalshi/websocket.ts` for a complete reference implementation.

### 12. `index.ts` -- Main exchange class

Wire everything together by extending `PredictionMarketExchange`:

```typescript
import { PredictionMarketExchange } from '../../BaseExchange';

export class ExampleExchange extends PredictionMarketExchange {
    private auth?: ExampleAuth;
    private ws?: ExampleWebSocket;

    constructor(credentials?: ExchangeCredentials) {
        super(credentials);
        if (credentials?.apiKey) {
            this.auth = new ExampleAuth(credentials);
        }
    }

    get name(): string {
        return 'Example';
    }

    // Market data -- delegate to fetch* modules
    protected async fetchMarketsImpl(params?: MarketFilterParams): Promise<UnifiedMarket[]> {
        return fetchMarkets(params);
    }
    // ... other fetch methods

    // Trading -- use this.ensureAuth() then call API
    async createOrder(params: CreateOrderParams): Promise<Order> { /* ... */ }
    // ... other trading methods

    // WebSocket -- lazy-init this.ws
    async watchOrderBook(id: string): Promise<OrderBook> {
        this.ensureAuth();
        if (!this.ws) this.ws = new ExampleWebSocket(this.auth!);
        return this.ws.watchOrderBook(id);
    }
    // ... watchTrades, close
}
```

The base class uses a delegation pattern: public methods like `fetchMarkets()` call protected `fetchMarketsImpl()`. Override the `*Impl` methods for market data. Trading and websocket methods are overridden directly.

## Registration Checklist

After implementing the exchange, register it in these 4 files:

### 1. `core/src/index.ts` -- Export the class

```typescript
// Add wildcard re-export
export * from './exchanges/<name>';

// Add to imports
import { ExampleExchange } from './exchanges/<name>';

// Add to default export object
const pmxt = {
    Polymarket: PolymarketExchange,
    Limitless: LimitlessExchange,
    Kalshi: KalshiExchange,
    Example: ExampleExchange,        // <-- add
};

// Add named export
export const Example = ExampleExchange;
```

### 2. `core/src/server/app.ts` -- Register with the server

```typescript
// Add to defaultExchanges record
const defaultExchanges: Record<string, any> = {
    polymarket: null,
    limitless: null,
    kalshi: null,
    example: null,        // <-- add
};

// Add case to createExchange() switch
case 'example':
    return new ExampleExchange({
        apiKey: credentials?.apiKey || process.env.EXAMPLE_API_KEY,
        privateKey: credentials?.privateKey || process.env.EXAMPLE_PRIVATE_KEY,
        // ... other credential fields as needed
    });
```

### 3. `core/src/server/openapi.yaml` -- Add to API schema

Add the exchange name to the `ExchangeParam` enum:

```yaml
components:
  parameters:
    ExchangeParam:
      in: path
      name: exchange
      schema:
        type: string
        enum: [polymarket, kalshi, limitless, example]  # <-- add
      required: true
```

After modifying the OpenAPI spec, regenerate SDK clients so they include the new exchange.

### 4. `core/COMPLIANCE.md` -- Add to compliance matrix

Add a column for the new exchange in the feature support table, marking each function as supported, unsupported, or partial.

## Testing

Run the test suite to verify your implementation:

```bash
# Unit tests
npm test

# Full verification (if available)
scripts/verify-all.sh
```

Write compliance tests that exercise every method. Tests should **fail** (not warn) if expected data is missing -- this catches API breakages early. See existing tests in `core/test/` for the expected patterns.

For authenticated tests, add environment variables to a `.env` file in the project root:

```
EXAMPLE_API_KEY=...
EXAMPLE_PRIVATE_KEY=...
```
