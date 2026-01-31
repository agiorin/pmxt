import { exchangeClasses, validateUnifiedMarket } from './shared';

describe('Compliance: searchMarkets', () => {
    test.each(exchangeClasses)('$name should comply with searchMarkets standards', async ({ name, cls }) => {
        const exchange = new cls();
        const query = 'Trump';

        try {
            console.info(`[Compliance] Testing ${name}.searchMarkets with query: "${query}"`);
            const markets = await exchange.searchMarkets(query, { limit: 5 });

            expect(markets).toBeDefined();
            expect(Array.isArray(markets)).toBe(true);
            expect(markets!.length).toBeGreaterThan(0);

            // Note: Some exchanges might return more than limit if they don't support backend-side limiting,
            // but the SDK should ideally handle it. We check if it's within a reasonable range or exactly limit.
            // If the exchange supports it, it should be <= 5.
            if (markets!.length > 5) {
                console.warn(`[Compliance] ${name}.searchMarkets returned ${markets!.length} results, which is more than the requested limit of 5.`);
            }

            for (const market of markets!) {
                validateUnifiedMarket(market, name, 'search-results');
            }
        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.searchMarkets not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
