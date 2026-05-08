import { Router } from './Router';
import { PmxtApiClient } from './client';
import { PredictionMarketExchange } from '../BaseExchange';
import { OrderBook } from '../types';

jest.mock('./client');

const MockedClient = PmxtApiClient as jest.MockedClass<typeof PmxtApiClient>;

function mockExchange(name: string, orderBook?: OrderBook): PredictionMarketExchange {
    return {
        name,
        fetchOrderBook: orderBook
            ? jest.fn().mockResolvedValue(orderBook)
            : jest.fn().mockRejectedValue(new Error('Not found')),
    } as unknown as PredictionMarketExchange;
}

describe('Router', () => {
    let router: Router;
    let clientInstance: jest.Mocked<PmxtApiClient>;

    beforeEach(() => {
        jest.clearAllMocks();
        MockedClient.mockClear();

        router = new Router({ apiKey: 'test-key' });
        clientInstance = MockedClient.mock.instances[0] as jest.Mocked<PmxtApiClient>;
    });

    describe('constructor', () => {
        it('has name "Router"', () => {
            expect(router.name).toBe('Router');
        });

        it('does not require exchanges option', () => {
            expect(() => new Router({ apiKey: 'key' })).not.toThrow();
        });
    });

    describe('fetchMarketMatches', () => {
        it('returns matches from the API using marketId', async () => {
            const mockApiResponse = [
                {
                    market: { marketId: 'k1', sourceExchange: 'kalshi', bestBid: 0.60, bestAsk: 0.65 },
                    relation: 'identity',
                    confidence: 0.95,
                    reasoning: 'Same resolution condition.',
                },
            ];
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({ matches: mockApiResponse });

            const result = await router.fetchMarketMatches({ marketId: 'm1', relation: 'identity' });
            expect(clientInstance.getMarketMatches).toHaveBeenCalledWith({ marketId: 'm1', relation: 'identity' });
            expect(result[0].confidence).toBe(0.95);
            expect(result[0].bestBid).toBe(0.60);
            expect(result[0].bestAsk).toBe(0.65);
        });

        it('accepts slug as identifier', async () => {
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({ matches: [] });

            await router.fetchMarketMatches({ slug: 'btc-100k' });
            expect(clientInstance.getMarketMatches).toHaveBeenCalledWith({ slug: 'btc-100k' });
        });

        it('returns empty array when no matches', async () => {
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({});
            const result = await router.fetchMarketMatches({ marketId: 'm1' });
            expect(result).toEqual([]);
        });
    });

    describe('fetchMatches (deprecated)', () => {
        it('delegates to fetchMarketMatches and logs deprecation warning', async () => {
            const mockApiResponse = [
                {
                    market: { marketId: 'k1', sourceExchange: 'kalshi', bestBid: 0.60, bestAsk: 0.65 },
                    relation: 'identity',
                    confidence: 0.95,
                    reasoning: 'Same resolution condition.',
                },
            ];
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({ matches: mockApiResponse });
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await router.fetchMatches({ marketId: 'm1' });
            expect(warnSpy).toHaveBeenCalledWith(
                '[pmxt] fetchMatches is deprecated, use fetchMarketMatches instead',
            );
            expect(result[0].confidence).toBe(0.95);
            warnSpy.mockRestore();
        });
    });

    describe('fetchEventMatches', () => {
        it('returns event matches from the API', async () => {
            const mockMatches = [
                { event: { id: 'e2' }, marketMatches: [] },
            ];
            clientInstance.getEventMatches = jest.fn().mockResolvedValue({ matches: mockMatches });

            const result = await router.fetchEventMatches({ eventId: 'e1' });
            expect(clientInstance.getEventMatches).toHaveBeenCalledWith({ eventId: 'e1' });
            expect(result).toEqual(mockMatches);
        });
    });

    describe('compareMarketPrices', () => {
        it('fetches identity matches with includePrices and maps to PriceComparison', async () => {
            const mockMatches = [
                {
                    market: { marketId: 'k1', sourceExchange: 'kalshi', outcomes: [], bestBid: 0.55, bestAsk: 0.62 },
                    relation: 'identity',
                    confidence: 0.9,
                    reasoning: 'Same market.',
                },
            ];
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({ matches: mockMatches });

            const result = await router.compareMarketPrices({ marketId: 'm1' });
            expect(clientInstance.getMarketMatches).toHaveBeenCalledWith({
                marketId: 'm1',
                relation: 'identity',
                includePrices: true,
            });
            expect(result).toHaveLength(1);
            expect(result[0].bestBid).toBe(0.55);
            expect(result[0].bestAsk).toBe(0.62);
            expect(result[0].venue).toBe('kalshi');
            expect(result[0].reasoning).toBe('Same market.');
        });
    });

    describe('fetchRelatedMarkets', () => {
        it('returns only subset/superset matches with reasoning', async () => {
            const mockMatches = [
                {
                    market: { marketId: 'k1', sourceExchange: 'kalshi', bestBid: 0.60, bestAsk: 0.65 },
                    relation: 'identity',
                    confidence: 0.95,
                    reasoning: 'Same.',
                },
                {
                    market: { marketId: 'k2', sourceExchange: 'kalshi', bestBid: 0.40, bestAsk: 0.45 },
                    relation: 'subset',
                    confidence: 0.8,
                    reasoning: 'Narrower market — nomination implies candidacy.',
                },
                {
                    market: { marketId: 'k3', sourceExchange: 'polymarket', bestBid: 0.70, bestAsk: 0.73 },
                    relation: 'superset',
                    confidence: 0.7,
                    reasoning: 'Broader — popular vote does not guarantee election win.',
                },
            ];
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({ matches: mockMatches });

            const result = await router.fetchRelatedMarkets({ marketId: 'm1' });
            expect(result).toHaveLength(2);
            expect(result[0].relation).toBe('subset');
            expect(result[0].reasoning).toBe('Narrower market — nomination implies candidacy.');
            expect(result[1].relation).toBe('superset');
        });
    });

    describe('fetchHedges (deprecated)', () => {
        it('delegates to fetchRelatedMarkets and logs deprecation warning', async () => {
            const mockMatches = [
                {
                    market: { marketId: 'k2', sourceExchange: 'kalshi', bestBid: 0.40, bestAsk: 0.45 },
                    relation: 'subset',
                    confidence: 0.8,
                    reasoning: 'Narrower market.',
                },
            ];
            clientInstance.getMarketMatches = jest.fn().mockResolvedValue({ matches: mockMatches });
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await router.fetchHedges({ marketId: 'm1' });
            expect(warnSpy).toHaveBeenCalledWith(
                '[pmxt] fetchHedges is deprecated, use fetchRelatedMarkets instead',
            );
            expect(result).toHaveLength(1);
            warnSpy.mockRestore();
        });
    });

    describe('fetchMarkets', () => {
        it('returns markets from the API', async () => {
            const mockMarkets = [{ marketId: 'm1', title: 'BTC' }];
            clientInstance.searchMarkets = jest.fn().mockResolvedValue(mockMarkets);

            const result = await router.fetchMarkets({ query: 'bitcoin' });
            expect(clientInstance.searchMarkets).toHaveBeenCalled();
            expect(result).toEqual(mockMarkets);
        });
    });

    describe('fetchEvents', () => {
        it('returns events from the API', async () => {
            const mockEvents = [{ id: 'e1', title: 'Election' }];
            clientInstance.searchEvents = jest.fn().mockResolvedValue(mockEvents);

            const result = await router.fetchEvents({ query: 'election' });
            expect(clientInstance.searchEvents).toHaveBeenCalled();
            expect(result).toEqual(mockEvents);
        });
    });

    describe('createOrder', () => {
        it('throws not implemented error', async () => {
            await expect(router.createOrder({} as any)).rejects.toThrow(
                'not implemented',
            );
        });
    });

    describe('fetchOrderBook', () => {
        it('throws when no exchanges are configured', async () => {
            await expect(router.fetchOrderBook('m1')).rejects.toThrow(
                'Router requires exchange instances for fetchOrderBook',
            );
        });

        it('merges orderbooks from matched markets', async () => {
            const polyBook: OrderBook = {
                bids: [{ price: 0.45, size: 100 }, { price: 0.44, size: 50 }],
                asks: [{ price: 0.47, size: 80 }, { price: 0.48, size: 60 }],
                timestamp: 1000,
            };
            const kalshiBook: OrderBook = {
                bids: [{ price: 0.46, size: 200 }, { price: 0.44, size: 75 }],
                asks: [{ price: 0.47, size: 120 }, { price: 0.49, size: 90 }],
                timestamp: 2000,
            };

            const polyExchange = mockExchange('polymarket', polyBook);
            const kalshiExchange = mockExchange('kalshi', kalshiBook);

            MockedClient.mockClear();
            const routerWithExchanges = new Router({
                apiKey: 'test-key',
                exchanges: { polymarket: polyExchange, kalshi: kalshiExchange },
            });
            const client = MockedClient.mock.instances[0] as jest.Mocked<PmxtApiClient>;

            // Match API returns kalshi as a match (source is polymarket)
            client.getMarketMatches = jest.fn().mockResolvedValue({
                matches: [{
                    market: {
                        marketId: 'k1',
                        sourceExchange: 'kalshi',
                        outcomes: [
                            { outcomeId: 'k1-yes', label: 'Yes', price: 0.46 },
                            { outcomeId: 'k1-no', label: 'No', price: 0.54 },
                        ],
                    },
                    relation: 'identity',
                    confidence: 0.95,
                    reasoning: null,
                }],
            });

            const result = await routerWithExchanges.fetchOrderBook('poly-token-yes', 'yes');

            // Bids merged: 0.46 (200), 0.45 (100), 0.44 (50+75=125)
            expect(result.bids).toEqual([
                { price: 0.46, size: 200 },
                { price: 0.45, size: 100 },
                { price: 0.44, size: 125 },
            ]);
            // Asks merged: 0.47 (80+120=200), 0.48 (60), 0.49 (90)
            expect(result.asks).toEqual([
                { price: 0.47, size: 200 },
                { price: 0.48, size: 60 },
                { price: 0.49, size: 90 },
            ]);

            // Kalshi was called with the matched outcome ID
            expect(kalshiExchange.fetchOrderBook).toHaveBeenCalledWith('k1-yes', 'yes');
            // Polymarket was called with the raw ID (source market)
            expect(polyExchange.fetchOrderBook).toHaveBeenCalledWith('poly-token-yes', 'yes');
        });

        it('returns single exchange book when no matches exist', async () => {
            const book: OrderBook = {
                bids: [{ price: 0.50, size: 100 }],
                asks: [{ price: 0.52, size: 80 }],
                timestamp: 1000,
            };
            const exchange = mockExchange('polymarket', book);

            MockedClient.mockClear();
            const routerWithExchanges = new Router({
                apiKey: 'test-key',
                exchanges: { polymarket: exchange },
            });
            const client = MockedClient.mock.instances[0] as jest.Mocked<PmxtApiClient>;
            client.getMarketMatches = jest.fn().mockResolvedValue({ matches: [] });

            const result = await routerWithExchanges.fetchOrderBook('token-id');

            expect(result.bids).toEqual([{ price: 0.50, size: 100 }]);
            expect(result.asks).toEqual([{ price: 0.52, size: 80 }]);
        });

        it('defaults side to yes when not specified', async () => {
            const exchange = mockExchange('kalshi', { bids: [], asks: [], timestamp: 0 });

            MockedClient.mockClear();
            const routerWithExchanges = new Router({
                apiKey: 'test-key',
                exchanges: { kalshi: exchange },
            });
            const client = MockedClient.mock.instances[0] as jest.Mocked<PmxtApiClient>;
            client.getMarketMatches = jest.fn().mockResolvedValue({ matches: [] });

            await routerWithExchanges.fetchOrderBook('ticker');

            expect(exchange.fetchOrderBook).toHaveBeenCalledWith('ticker', 'yes');
        });

        it('skips exchanges that fail and returns partial results', async () => {
            const book: OrderBook = {
                bids: [{ price: 0.50, size: 100 }],
                asks: [{ price: 0.55, size: 50 }],
                timestamp: 1000,
            };
            const goodExchange = mockExchange('kalshi', book);
            const badExchange = mockExchange('limitless'); // rejects

            MockedClient.mockClear();
            const routerWithExchanges = new Router({
                apiKey: 'test-key',
                exchanges: { kalshi: goodExchange, limitless: badExchange },
            });
            const client = MockedClient.mock.instances[0] as jest.Mocked<PmxtApiClient>;
            client.getMarketMatches = jest.fn().mockResolvedValue({ matches: [] });

            const result = await routerWithExchanges.fetchOrderBook('ticker', 'yes');

            expect(result.bids).toEqual([{ price: 0.50, size: 100 }]);
            expect(result.asks).toEqual([{ price: 0.55, size: 50 }]);
        });

        it('returns empty orderbook when all exchanges fail', async () => {
            const badExchange = mockExchange('polymarket');

            MockedClient.mockClear();
            const routerWithExchanges = new Router({
                apiKey: 'test-key',
                exchanges: { polymarket: badExchange },
            });
            const client = MockedClient.mock.instances[0] as jest.Mocked<PmxtApiClient>;
            client.getMarketMatches = jest.fn().mockResolvedValue({ matches: [] });

            const result = await routerWithExchanges.fetchOrderBook('bad-id');

            expect(result.bids).toEqual([]);
            expect(result.asks).toEqual([]);
        });
    });

    describe('capabilities', () => {
        it('reports matching methods as supported', () => {
            expect(router.has.fetchMarketMatches).toBe(true);
            expect(router.has.fetchMatches).toBe(true);
            expect(router.has.fetchEventMatches).toBe(true);
            expect(router.has.compareMarketPrices).toBe(true);
            expect(router.has.fetchRelatedMarkets).toBe(true);
            expect(router.has.fetchMatchedMarkets).toBe(true);
            expect(router.has.fetchMatchedPrices).toBe(true);
            expect(router.has.fetchHedges).toBe(true);
            expect(router.has.fetchArbitrage).toBe(true);
        });

        it('reports fetchOrderBook as supported', () => {
            expect(router.has.fetchOrderBook).toBe(true);
        });

        it('reports trading methods as unsupported', () => {
            expect(router.has.createOrder).toBe(false);
            expect(router.has.cancelOrder).toBe(false);
        });

        it('reports search methods as supported', () => {
            expect(router.has.fetchMarkets).toBe(true);
            expect(router.has.fetchEvents).toBe(true);
        });
    });
});
