# Prediction Market API Reference

This project implements a **Unified Interface** for interacting with multiple prediction market exchanges (Kalshi, Polymarket) identically.

## Usage

All components are available directly from the `pmxt` library.

```typescript
import pmxt from 'pmxtjs';

// ccxt-style instantiation
const polymarket = new pmxt.polymarket();
const kalshi = new pmxt.kalshi();
```

## 1. Unified Interface (`PredictionMarketExchange`)

All exchanges implement this core interface for discovery.

### `fetchMarkets(params?)`
Retrieves active markets normalized into a standard format.
- **Input**: `limit`, `sort` ('volume' | 'liquidity' | 'newest')
- **Output**: `Promise<UnifiedMarket[]>`

### `searchMarkets(query, params?)`
Search markets by title/description across the exchange(s).
- **Input**: `query` (string), `limit`
- **Output**: `Promise<UnifiedMarket[]>`

---

## 2. Deep-Dive Interface (Exchange Only)

Methods available on specific exchange instances (`KalshiExchange`, `PolymarketExchange`) for detailed data.

### `fetchOHLCV(id, params)`
Fetches OHLCV candlesticks.
- **Input**: `id`, `resolution` (1m, 1h, 1d), `start`, `end`.
- **Output**: `Promise<PriceCandle[]>`
- **Important**:
  - **Kalshi**: Uses the Market Ticker (e.g., `FED-25DEC`). Returns **native OHLCV** (Open/High/Low/Close data is distinct).
  - **Polymarket**: Uses the **CLOB Token ID** found in `outcome.metadata.clobTokenId`. Returns **synthetic candles** (Open=High=Low=Close) derived from raw price points.

### `fetchOrderBook(id)`
Fetches live Bids/Asks.
- **Input**: `id` (Ticker for Kalshi, Token ID for Polymarket).
- **Output**: `Promise<OrderBook>` (Normalized: "No" bids becomes "Yes" asks).

### `fetchTrades(id, params)`
Fetches the "Tape" (raw transaction history).
- **Input**: `id`, `limit`.
- **Output**: `Promise<Trade[]>`
- **Note**: 
  - **Kalshi**: Publicly accessible for all tickers.
  - **Polymarket**: Requires L2 Authentication (API Key). Without a key, this method will throw an unauthorized error. Use `fetchOHLCV` for public historical data.

---

## 3. Data Models

### `UnifiedMarket` (The Standard Atom)
```typescript
{
  id: string;          // Exchange-specific ID
  title: string;       // "Who will win the election?"
  description: string; // Detailed context/rules of the market
  outcomes: [
    { 
      id: string, 
      label: "Trump", 
      price: 0.52,
      priceChange24h: 0.05, // Optional: Change in price over last 24h
      metadata: { ... }      // Exchange-specific keys (clobTokenId)
    }
  ];
  resolutionDate: Date;
  volume24h: number;
  liquidity: number;
  url: string;
  image?: string;       // Optional: Thumbnail URL
  category?: string;    // Optional: Primary category (e.g., "Politics")
  tags?: string[];      // Optional: Searchable tags
}
```

