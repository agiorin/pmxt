import { describe, test, expect } from '@jest/globals';
import { SmarketsNormalizer } from '../../../src/exchanges/smarkets/normalizer';
import {
    SmarketsRawEvent,
    SmarketsRawMarket,
    SmarketsRawContract,
    SmarketsRawVolume,
    SmarketsRawQuote,
    SmarketsRawActivityRow,
    SmarketsRawOrder,
    SmarketsRawBalance,
    SmarketsRawEventWithMarkets,
} from '../../../src/exchanges/smarkets/fetcher';

const normalizer = new SmarketsNormalizer();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RAW_EVENT: SmarketsRawEvent = {
    id: 'evt-1',
    name: 'Will it rain tomorrow?',
    description: 'Daily weather market.',
    slug: 'will-it-rain',
    full_slug: '/event/evt-1/will-it-rain',
    state: 'live',
    type: 'weather_daily',
    parent_id: null,
    start_datetime: '2026-04-07T00:00:00Z',
    start_date: '2026-04-07',
    end_date: '2026-04-08T00:00:00Z',
    created: '2026-04-01T00:00:00Z',
    modified: '2026-04-01T00:00:00Z',
};

const RAW_MARKET: SmarketsRawMarket = {
    id: 'mkt-1',
    event_id: 'evt-1',
    name: 'Rain market',
    slug: 'rain',
    state: 'live',
    description: 'Will it rain?',
    bet_delay: 0,
    complete: false,
    winner_count: 1,
    hidden: false,
    display_type: 'binary',
    display_order: 1,
    cashout_enabled: true,
    created: '2026-04-01T00:00:00Z',
    modified: '2026-04-01T00:00:00Z',
    market_type: { name: 'binary' },
    category: 'weather',
};

const RAW_CONTRACTS: SmarketsRawContract[] = [
    {
        id: 'ct-yes',
        market_id: 'mkt-1',
        name: 'Yes',
        slug: 'yes',
        state_or_outcome: 'open',
        created: '2026-04-01T00:00:00Z',
        modified: '2026-04-01T00:00:00Z',
        outcome_timestamp: null,
        display_order: 1,
    },
    {
        id: 'ct-no',
        market_id: 'mkt-1',
        name: 'No',
        slug: 'no',
        state_or_outcome: 'open',
        created: '2026-04-01T00:00:00Z',
        modified: '2026-04-01T00:00:00Z',
        outcome_timestamp: null,
        display_order: 2,
    },
];

const RAW_VOLUMES: SmarketsRawVolume[] = [
    { market_id: 'mkt-1', volume: 50000, double_stake_volume: 100000 },
];

const RAW_BUNDLE: SmarketsRawEventWithMarkets = {
    event: RAW_EVENT,
    markets: [RAW_MARKET],
    contracts: RAW_CONTRACTS,
    volumes: RAW_VOLUMES,
};

// ---------------------------------------------------------------------------
// normalizeMarket / normalizeMarketsFromEvent
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizeMarket', () => {
    test('returns null when raw markets is empty', () => {
        const empty: SmarketsRawEventWithMarkets = {
            event: RAW_EVENT,
            markets: [],
            contracts: [],
            volumes: [],
        };
        expect(normalizer.normalizeMarket(empty)).toBeNull();
    });

    test('produces a UnifiedMarket with outcomes, volume, and tags', () => {
        const um = normalizer.normalizeMarket(RAW_BUNDLE)!;
        expect(um.marketId).toBe('mkt-1');
        expect(um.eventId).toBe('evt-1');
        expect(um.title).toBe('Will it rain tomorrow?');
        expect(um.outcomes).toHaveLength(2);
        expect(um.outcomes.map((o) => o.label)).toEqual(['Yes', 'No']);
        expect(um.volume).toBe(5); // 50000 / 10000
        expect(um.url).toBe('https://smarkets.com/event/evt-1/will-it-rain');
        expect(um.category).toBe('weather');
        expect(um.tags).toContain('weather');
    });

    test('attaches yes/no helpers for binary markets', () => {
        const um = normalizer.normalizeMarket(RAW_BUNDLE)!;
        expect(um.yes?.label).toBe('Yes');
        expect(um.no?.label).toBe('No');
    });

    test('uses event.full_slug for the URL when present', () => {
        const um = normalizer.normalizeMarket(RAW_BUNDLE)!;
        expect(um.url).toBe('https://smarkets.com/event/evt-1/will-it-rain');
    });

    test('falls back to slug-based URL when full_slug is missing', () => {
        const noFullSlug: SmarketsRawEventWithMarkets = {
            ...RAW_BUNDLE,
            event: { ...RAW_EVENT, full_slug: '' },
        };
        const um = normalizer.normalizeMarket(noFullSlug)!;
        expect(um.url).toBe('https://smarkets.com/event/evt-1/will-it-rain');
    });

    test('extracts category from object-type event.type', () => {
        const objectType: SmarketsRawEventWithMarkets = {
            ...RAW_BUNDLE,
            event: { ...RAW_EVENT, type: { domain: 'sports', scope: 'single_event' } },
        };
        const um = normalizer.normalizeMarket(objectType)!;
        expect(um.category).toBe('sports');
    });
});

describe('SmarketsNormalizer.normalizeMarketsFromEvent', () => {
    test('normalizes every market in the bundle', () => {
        const second: SmarketsRawMarket = { ...RAW_MARKET, id: 'mkt-2', name: 'Second' };
        const bundle: SmarketsRawEventWithMarkets = {
            ...RAW_BUNDLE,
            markets: [RAW_MARKET, second],
            contracts: [
                ...RAW_CONTRACTS,
                { ...RAW_CONTRACTS[0], id: 'ct-yes-2', market_id: 'mkt-2' },
                { ...RAW_CONTRACTS[1], id: 'ct-no-2', market_id: 'mkt-2' },
            ],
            volumes: [
                ...RAW_VOLUMES,
                { market_id: 'mkt-2', volume: 20000, double_stake_volume: 40000 },
            ],
        };
        const markets = normalizer.normalizeMarketsFromEvent(bundle);
        expect(markets).toHaveLength(2);
        expect(markets.map((m) => m.marketId)).toEqual(['mkt-1', 'mkt-2']);
        expect(markets[1].volume).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// normalizeEvent
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizeEvent', () => {
    test('returns null when event is missing', () => {
        const bad = { event: undefined } as unknown as SmarketsRawEventWithMarkets;
        expect(normalizer.normalizeEvent(bad)).toBeNull();
    });

    test('aggregates child markets and totals their volume', () => {
        const ue = normalizer.normalizeEvent(RAW_BUNDLE)!;
        expect(ue.id).toBe('evt-1');
        expect(ue.markets).toHaveLength(1);
        expect(ue.volume).toBe(5);
        expect(ue.tags).toContain('weather');
    });
});

// ---------------------------------------------------------------------------
// normalizeOrderBook
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizeOrderBook', () => {
    test('converts bids/offers to unified format and sorts them', () => {
        const raw: Record<string, SmarketsRawQuote> = {
            'ct-yes': {
                bids: [
                    { price: 5500, quantity: 10000 },
                    { price: 5600, quantity: 20000 },
                ],
                offers: [
                    { price: 5800, quantity: 30000 },
                    { price: 5700, quantity: 40000 },
                ],
            },
        };
        const ob = normalizer.normalizeOrderBook(raw, 'mkt-1');
        expect(ob.bids[0].price).toBe(0.56); // best (highest) bid first
        expect(ob.bids[1].price).toBe(0.55);
        expect(ob.asks[0].price).toBe(0.57); // best (lowest) ask first
        expect(ob.asks[1].price).toBe(0.58);
        expect(ob.bids[0].size).toBe(2); // 20000 / 10000
        expect(typeof ob.timestamp).toBe('number');
    });

    test('handles missing bids/offers arrays gracefully', () => {
        const raw: Record<string, SmarketsRawQuote> = {
            'ct-yes': { bids: undefined as any, offers: undefined as any },
        };
        const ob = normalizer.normalizeOrderBook(raw, 'mkt-1');
        expect(ob.bids).toEqual([]);
        expect(ob.asks).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// normalizeActivityTrade / normalizeActivityUserTrade
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer trade normalization', () => {
    const base: SmarketsRawActivityRow = {
        amount: '1.00',
        commission: '0',
        contract_id: 'ct-yes',
        event_id: 'evt-1',
        market_id: 'mkt-1',
        order_id: 'ord-1',
        price: 5500,
        quantity: 10000,
        quantity_change: 0,
        side: 'buy',
        source: 'order.execute',
        timestamp: '2026-04-06T12:00:00Z',
        seq: 42,
        subseq: 1,
        money: null,
        money_change: null,
        exposure: null,
        label: null,
    };

    test('normalizeActivityTrade returns a public Trade', () => {
        const trade = normalizer.normalizeActivityTrade(base, 0);
        expect(trade.id).toBe('42-1');
        expect(trade.price).toBe(0.55);
        expect(trade.amount).toBe(1);
        expect(trade.side).toBe('buy');
        expect(trade.outcomeId).toBe('ct-yes');
        expect(trade.timestamp).toBe(new Date('2026-04-06T12:00:00Z').getTime());
    });

    test('coerces missing price/quantity to 0', () => {
        const trade = normalizer.normalizeActivityTrade(
            { ...base, price: null, quantity: null },
            0,
        );
        expect(trade.price).toBe(0);
        expect(trade.amount).toBe(0);
    });

    test('falls back to "unknown" side for unrecognized values', () => {
        const trade = normalizer.normalizeActivityTrade({ ...base, side: 'lay' }, 0);
        expect(trade.side).toBe('unknown');
    });

    test('normalizeActivityUserTrade preserves the orderId', () => {
        const ut = normalizer.normalizeActivityUserTrade(base, 0);
        expect(ut.orderId).toBe('ord-1');
        expect(ut.price).toBe(0.55);
    });
});

// ---------------------------------------------------------------------------
// normalizeOrder
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizeOrder', () => {
    const base: SmarketsRawOrder = {
        id: 'ord-1',
        market_id: 'mkt-1',
        contract_id: 'ct-yes',
        side: 'buy',
        state: 'partial',
        type: 'good_til_halted',
        price: 5500,
        quantity: 10000,
        quantity_filled: 4000,
        quantity_unfilled: 6000,
        created_datetime: '2026-04-06T12:00:00Z',
        last_modified_datetime: '2026-04-06T12:01:00Z',
    };

    test('maps fields and converts units', () => {
        const order = normalizer.normalizeOrder(base);
        expect(order.id).toBe('ord-1');
        expect(order.price).toBe(0.55);
        expect(order.amount).toBe(1);
        expect(order.filled).toBeCloseTo(0.4);
        expect(order.remaining).toBeCloseTo(0.6);
        expect(order.status).toBe('open');
        expect(order.type).toBe('limit');
    });

    test('maps state "created" to pending', () => {
        const order = normalizer.normalizeOrder({ ...base, state: 'created' });
        expect(order.status).toBe('pending');
    });

    test('maps state "filled" and "settled" to filled', () => {
        expect(normalizer.normalizeOrder({ ...base, state: 'filled' }).status).toBe('filled');
        expect(normalizer.normalizeOrder({ ...base, state: 'settled' }).status).toBe('filled');
    });

    test('maps immediate_or_cancel type to "market"', () => {
        const order = normalizer.normalizeOrder({ ...base, type: 'immediate_or_cancel' });
        expect(order.type).toBe('market');
    });
});

// ---------------------------------------------------------------------------
// normalizeCreateOrderResponse
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizeCreateOrderResponse', () => {
    test('marks fully filled orders as "filled"', () => {
        const order = normalizer.normalizeCreateOrderResponse({
            order_id: 'ord-1',
            market_id: 'mkt-1',
            contract_id: 'ct-yes',
            side: 'buy',
            price: 5500,
            quantity: 10000,
            total_executed_quantity: 10000,
            available_quantity: 0,
        });
        expect(order.status).toBe('filled');
        expect(order.filled).toBe(1);
        expect(order.remaining).toBe(0);
    });

    test('marks partial orders as "open"', () => {
        const order = normalizer.normalizeCreateOrderResponse({
            order_id: 'ord-1',
            market_id: 'mkt-1',
            contract_id: 'ct-yes',
            side: 'buy',
            price: 5500,
            quantity: 10000,
            total_executed_quantity: 4000,
            available_quantity: 6000,
        });
        expect(order.status).toBe('open');
    });

    test('marks unfilled orders as "pending"', () => {
        const order = normalizer.normalizeCreateOrderResponse({
            order_id: 'ord-1',
            market_id: 'mkt-1',
            contract_id: 'ct-yes',
            side: 'buy',
            price: 5500,
            quantity: 10000,
            total_executed_quantity: 0,
            available_quantity: 10000,
        });
        expect(order.status).toBe('pending');
    });
});

// ---------------------------------------------------------------------------
// normalizePosition
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizePosition', () => {
    const base: SmarketsRawOrder = {
        id: 'ord-1',
        market_id: 'mkt-1',
        contract_id: 'ct-yes',
        side: 'buy',
        state: 'partial',
        type: 'good_til_halted',
        price: 5500,
        quantity: 10000,
        quantity_filled: 6000,
        quantity_unfilled: 4000,
        created_datetime: '2026-04-06T12:00:00Z',
        last_modified_datetime: '2026-04-06T12:01:00Z',
        average_price_matched: 5400,
    };

    test('reports a long (positive) size for buy orders', () => {
        const pos = normalizer.normalizePosition(base);
        expect(pos.size).toBeCloseTo(0.6);
        expect(pos.entryPrice).toBe(0.54);
    });

    test('reports a short (negative) size for sell orders', () => {
        const pos = normalizer.normalizePosition({ ...base, side: 'sell' });
        expect(pos.size).toBeCloseTo(-0.6);
    });

    test('falls back to order price when no average is matched', () => {
        const pos = normalizer.normalizePosition({
            ...base,
            average_price_matched: undefined,
        });
        expect(pos.entryPrice).toBe(0.55);
    });
});

// ---------------------------------------------------------------------------
// normalizeBalance
// ---------------------------------------------------------------------------

describe('SmarketsNormalizer.normalizeBalance', () => {
    test('parses string balances and computes locked = total - available', () => {
        const raw: SmarketsRawBalance = {
            account_id: 'acc-1',
            balance: '100.00',
            available_balance: '70.00',
            exposure: '30.00',
            currency: 'GBP',
        };
        const balances = normalizer.normalizeBalance(raw);
        expect(balances).toHaveLength(1);
        expect(balances[0].currency).toBe('GBP');
        expect(balances[0].total).toBe(100);
        expect(balances[0].available).toBe(70);
        expect(balances[0].locked).toBe(30);
    });

    test('defaults the currency to GBP when missing', () => {
        const raw = {
            account_id: 'acc-1',
            balance: '0',
            available_balance: '0',
            exposure: '0',
        } as SmarketsRawBalance;
        const balances = normalizer.normalizeBalance(raw);
        expect(balances[0].currency).toBe('GBP');
        expect(balances[0].total).toBe(0);
    });
});
