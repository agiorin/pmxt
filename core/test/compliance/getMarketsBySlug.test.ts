import { exchangeClasses, validateUnifiedMarket } from './shared';

describe('Compliance: getMarketsBySlug', () => {
    test.each(exchangeClasses)('$name should comply with getMarketsBySlug standards', async ({ name, cls }) => {
        const exchange = new cls();
        const searchQueries = ['Trump', 'Fed', 'Crypto', 'Yes']; // Fallback queries
        let validSlug: string | undefined;

        // 1. Find a valid slug dynamically to ensure the test doesn't rot
        // 1. Find a valid slug dynamically to ensure the test doesn't rot
        for (const query of searchQueries) {
            try {
                // Try searchEvents first (preferred for slug)
                try {
                    const events = await exchange.searchEvents(query, { limit: 1 });
                    if (events && events.length > 0) {
                        validSlug = events[0].slug || events[0].id;
                        if (validSlug) break;
                    }
                } catch (e) {
                    // Ignore not implemented
                }

                // Fallback to searchMarkets if searchEvents yields nothing or not supported
                if (!validSlug) {
                    try {
                        const markets = await exchange.searchMarkets(query, { limit: 1 });
                        if (markets && markets.length > 0) {
                            // Some exchanges might use ID as slug if no explicit slug field
                            validSlug = markets[0].id;
                            if (validSlug) break;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            } catch (e) {
                // Ignore search errors, try next query
            }
        }

        expect(validSlug).toBeDefined();

        console.info(`[Compliance] Testing ${name}.getMarketsBySlug with dynamic slug: "${validSlug}"`);

        try {
            const markets = await exchange.getMarketsBySlug(validSlug!);

            expect(markets).toBeDefined();
            expect(Array.isArray(markets)).toBe(true);
            expect(markets!.length).toBeGreaterThan(0);

            for (const market of markets) {
                validateUnifiedMarket(market, name, validSlug!);
            }
        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.getMarketsBySlug not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000); // Increased timeout for the search steps
});
