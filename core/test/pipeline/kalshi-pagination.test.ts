import { KalshiFetcher } from '../../src/exchanges/kalshi/fetcher';

function buildEvents(count: number, offset = 0) {
    return Array.from({ length: count }, (_, i) => ({
        event_ticker: `KXTEST-${offset + i}`,
        title: `Test event ${offset + i}`,
        markets: [],
    }));
}

function createFetcher(responses: Array<{ events: unknown[]; cursor?: string | null }>) {
    const calls: unknown[] = [];
    const ctx: any = {
        http: {},
        getHeaders: () => ({}),
        callApi: async (_operation: string, params?: unknown) => {
            calls.push(params ?? {});
            const response = responses.shift();
            if (!response) return { events: [], cursor: null };
            return response;
        },
    };

    return { fetcher: new KalshiFetcher(ctx), calls };
}

describe('Kalshi cursor pagination', () => {
    it('fetches exactly the requested event count and returns the next cursor', async () => {
        const { fetcher, calls } = createFetcher([
            { events: buildEvents(200), cursor: 'cursor-200' },
            { events: buildEvents(200, 200), cursor: 'cursor-400' },
            { events: buildEvents(50, 400), cursor: 'cursor-500' },
        ]);

        const page = await fetcher.fetchRawEventPage({ limit: 450 });

        expect(page.events).toHaveLength(450);
        expect(page.cursor).toBe('cursor-500');
        expect(calls).toEqual([
            { limit: 200, with_nested_markets: true, status: 'open' },
            { limit: 200, with_nested_markets: true, status: 'open', cursor: 'cursor-200' },
            { limit: 50, with_nested_markets: true, status: 'open', cursor: 'cursor-400' },
        ]);
    });

    it('starts from a supplied cursor', async () => {
        const { fetcher, calls } = createFetcher([
            { events: buildEvents(25, 500), cursor: 'cursor-525' },
        ]);

        const page = await fetcher.fetchRawEventPage({ limit: 25, cursor: 'cursor-500' });

        expect(page.events).toHaveLength(25);
        expect(page.cursor).toBe('cursor-525');
        expect(calls).toEqual([
            { limit: 25, with_nested_markets: true, status: 'open', cursor: 'cursor-500' },
        ]);
    });
});
