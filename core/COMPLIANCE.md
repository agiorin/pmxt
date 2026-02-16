# Feature Support & Compliance

This document details the feature support and compliance status for each exchange. PMXT enforces a strict compliance standard to ensure protocol consistency across all implementations.

## Functions Status

| Category | Function | Polymarket | Kalshi | Limitless | Baozi | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Identity** | `name` | | | | | |
| **Market Data** | `fetchMarkets` | | | | | Baozi: On-chain Market + RaceMarket accounts |
| | `searchMarkets` | | | | | |
| | `getMarketsBySlug` | | | | | |
| | `searchEvents` | | | | | Baozi: 1:1 market-to-event mapping |
| **Public Data** | `fetchOHLCV` | | | |  | Baozi: No historical price data (no indexer) |
| | `fetchOrderBook` | | | | | Baozi: Synthetic from pool ratios (pari-mutuel) |
| | `fetchTrades` | | |  |  | Limitless/Baozi: No public trades API |
| **Private Data** | `fetchBalance` | | | | | Baozi: SOL balance via getBalance() |
| | `fetchPositions` | | | | | Baozi: UserPosition + RacePosition PDAs |
| **Trading** | `createOrder` | | | | | Baozi: place_bet_sol / bet_on_race_outcome_sol |
| | `cancelOrder` | | | |  | Baozi: Pari-mutuel bets are irrevocable |
| | `fetchOrder` | | |  | | Baozi: Transaction signature lookup |
| | `fetchOpenOrders` | | | | | Baozi: Always empty (instant execution) |
| **Calculations** | `getExecutionPrice` | | | | | |
| | `getExecutionPriceDetailed` | | | | | |
| **Real-time** | `watchOrderBook` | | |  | | Baozi: Solana onAccountChange subscription |
| | `watchTrades` | | |  |  | Limitless/Baozi: No trade stream |

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
# Limitless
LIMITLESS_PRIVATE_KEY=0x...
```
