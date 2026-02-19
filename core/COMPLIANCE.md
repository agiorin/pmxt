# Feature Support & Compliance

This document details the feature support and compliance status for each exchange. PMXT enforces a strict compliance standard to ensure protocol consistency across all implementations.

## Functions Status

| Category | Function | Polymarket | Kalshi | Limitless | Baozi | Myriad | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Identity** | `name` | | | | | | |
| **Market Data** | `fetchMarkets` | | | | | | Myriad: Multi-chain (Abstract, Linea, BNB) |
| | `searchMarkets` | | | | | | Myriad: keyword param on /markets |
| | `getMarketsBySlug` | | | | | | |
| | `searchEvents` | | | | | | Myriad: keyword param on /questions |
| **Public Data** | `fetchOHLCV` | | | |  |  | Baozi: No historical data. Myriad: Fixed timeframe charts only |
| | `fetchOrderBook` | | | | |  | Baozi: Synthetic from pool ratios. Myriad: Synthetic from AMM price |
| | `fetchTrades` | | |  |  | | Myriad: via /markets/:id/events (buy/sell actions) |
| **Private Data** | `fetchBalance` | | | | |  | Myriad: Approximated from portfolio (no balance endpoint) |
| | `fetchPositions` | | | | | | Myriad: via /users/:address/portfolio |
| **Trading** | `createOrder` | | | | |  | Myriad: Returns quote + calldata (AMM, no on-chain execution) |
| | `cancelOrder` | | | |  |  | Baozi/Myriad: Not supported (pari-mutuel/AMM) |
| | `fetchOrder` | | |  |  |  | Myriad: Not supported (AMM) |
| | `fetchOpenOrders` | | | | | | Myriad: Always empty (AMM, instant execution) |
| **Calculations** | `getExecutionPrice` | | | | | | |
| | `getExecutionPriceDetailed` | | | | | | |
| **Real-time** | `watchOrderBook` | | |  |  |  | Myriad: Poll-based fallback (no WebSocket API) |
| | `watchTrades` | | |  |  |  | Myriad: Poll-based fallback (no WebSocket API) |

## Legend
- Compliance Verified (Strict Test Passed)
-  Compliance Failure (Test Failed or Feature Broken)
-  Partial Support / Skipped (e.g., Missing API/Websocket)

## Compliance Policy
- **Failure over Warning**: Tests must fail if no relevant data (markets, events, candles) is found. This ensures that we catch API breakages or unexpected empty responses.

## Tests with authentication
requires a dotenv in the root dir with
```
POLYMARKET_PRIVATE_KEY=0x...
# Kalshi
KALSHI_API_KEY=...
KALSHI_PRIVATE_KEY=... (RSA Private Key)
KALSHI_DEMO_MODE=...  # Optional: Set to 'false' to use demo environment
# Limitless
LIMITLESS_PRIVATE_KEY=0x...
# Myriad
MYRIAD_API_KEY=...
MYRIAD_WALLET_ADDRESS=0x...
```
