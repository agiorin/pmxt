/**
 * Targeted tests for DX changes:
 * 1. Passthrough converters (new fields survive)
 * 2. Typed SDK params (MarketFetchParams, etc.)
 * 3. outcomeId param rename
 * 4. resolveOutcomeId accepts MarketOutcome objects
 */

import { Polymarket } from "../index";
import type {
    UnifiedMarket,
    MarketOutcome,
    MarketFilterParams,
    MyTradesParams,
    OrderHistoryParams,
    OHLCVParams,
    TradesParams,
} from "../pmxt/models";

let poly: InstanceType<typeof Polymarket>;
let serverAvailable = false;

beforeAll(async () => {
    poly = new Polymarket();
    try {
        const markets = await poly.fetchMarkets({ limit: 1 });
        serverAvailable = markets.length > 0;
    } catch {
        console.warn("Sidecar not available, skipping live tests");
    }
}, 60000);

// ---------------------------------------------------------------
// 1. Passthrough converters -- fields survive the SDK layer
// ---------------------------------------------------------------
describe("passthrough converters", () => {
    it("fetchMarkets returns all UnifiedMarket fields", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 3 });
        expect(markets.length).toBeGreaterThan(0);

        const m = markets[0];
        expect(m.marketId).toBeDefined();
        expect(m.title).toBeDefined();
        expect(typeof m.title).toBe("string");
        expect(m.outcomes).toBeDefined();
        expect(Array.isArray(m.outcomes)).toBe(true);
        expect(m.outcomes.length).toBeGreaterThan(0);

        expect(typeof m.volume24h).toBe("number");
        expect(typeof m.liquidity).toBe("number");

        const outcome = m.outcomes[0];
        expect(outcome.outcomeId).toBeDefined();
        expect(typeof outcome.price).toBe("number");
        expect(outcome.label).toBeDefined();
    });

    it("fetchOrderBook returns bids and asks arrays", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 1 });
        const outcomeId = markets[0].outcomes[0].outcomeId;

        const book = await poly.fetchOrderBook(outcomeId);
        expect(book.bids).toBeDefined();
        expect(book.asks).toBeDefined();
        expect(Array.isArray(book.bids)).toBe(true);
        expect(Array.isArray(book.asks)).toBe(true);
        if (book.bids.length > 0) {
            expect(typeof book.bids[0].price).toBe("number");
            expect(typeof book.bids[0].size).toBe("number");
        }
    });

    it("fetchEvents preserves event fields via spread", async () => {
        if (!serverAvailable) return;
        const events = await poly.fetchEvents({ limit: 1 });
        expect(events.length).toBeGreaterThan(0);

        const ev = events[0];
        expect(ev.id).toBeDefined();
        expect(ev.title).toBeDefined();
        expect(ev.markets).toBeDefined();
        expect(ev.markets.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------
// 2. Typed SDK params -- compile-time check + runtime verification
// ---------------------------------------------------------------
describe("typed SDK params", () => {
    it("fetchMarkets accepts MarketFilterParams (typed, not any)", async () => {
        if (!serverAvailable) return;
        const params: MarketFilterParams = { limit: 2, sort: "volume" };
        const markets = await poly.fetchMarkets(params);
        expect(markets.length).toBeLessThanOrEqual(2);
    });

    it("param type interfaces exist and are importable", () => {
        // Pure compile-time test -- these imports would fail if types missing
        const _myTradesParams: MyTradesParams = {};
        const _orderHistoryParams: OrderHistoryParams = {};
        const _ohlcvParams: OHLCVParams = { resolution: "1h" };
        const _tradesParams: TradesParams = {};
        expect(_myTradesParams).toBeDefined();
        expect(_orderHistoryParams).toBeDefined();
        expect(_ohlcvParams).toBeDefined();
        expect(_tradesParams).toBeDefined();
    });
});

// ---------------------------------------------------------------
// 3. outcomeId param rename -- methods still work correctly
// ---------------------------------------------------------------
describe("outcomeId param rename", () => {
    it("fetchOrderBook works with outcomeId string", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 1 });
        const outcomeId = markets[0].outcomes[0].outcomeId;

        const book = await poly.fetchOrderBook(outcomeId);
        expect(book.bids).toBeDefined();
        expect(book.asks).toBeDefined();
    });

    it("fetchOHLCV works with outcomeId string", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 1 });
        const outcomeId = markets[0].outcomes[0].outcomeId;

        const candles = await poly.fetchOHLCV(outcomeId, {
            resolution: "1d",
            limit: 5,
        });
        expect(Array.isArray(candles)).toBe(true);
    });
});

// ---------------------------------------------------------------
// 4. resolveOutcomeId -- accepts MarketOutcome objects
// ---------------------------------------------------------------
describe("resolveOutcomeId accepts MarketOutcome", () => {
    it("fetchOrderBook accepts a MarketOutcome object", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 1 });
        const outcome: MarketOutcome = markets[0].outcomes[0];

        const book = await poly.fetchOrderBook(outcome);
        expect(book.bids).toBeDefined();
        expect(book.asks).toBeDefined();
    });

    it("fetchOHLCV accepts a MarketOutcome object", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 1 });
        const outcome: MarketOutcome = markets[0].outcomes[0];

        const candles = await poly.fetchOHLCV(outcome, {
            resolution: "1d",
            limit: 3,
        });
        expect(Array.isArray(candles)).toBe(true);
    });

    it("yes/no convenience accessors work as MarketOutcome", async () => {
        if (!serverAvailable) return;
        const markets = await poly.fetchMarkets({ limit: 5 });
        const binary = markets.find((m) => m.yes && m.no);
        if (!binary) return;

        const book = await poly.fetchOrderBook(binary.yes!);
        expect(book.bids).toBeDefined();
    });
});
