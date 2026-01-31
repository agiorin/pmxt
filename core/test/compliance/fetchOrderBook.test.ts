import { exchangeClasses, validateOrderBook } from './shared';

describe('Compliance: fetchOrderBook', () => {
    test.each(exchangeClasses)('$name should comply with fetchOrderBook standards', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            console.info(`[Compliance] Testing ${name}.fetchOrderBook`);

            // 1. Get a market to find an outcome ID
            const markets = await exchange.fetchMarkets({ limit: 5 });
            if (!markets || markets.length === 0) {
                throw new Error(`${name}: No markets found to test fetchOrderBook`);
            }

            let orderbook: any;
            let testedOutcomeId = '';

            // Try to find an outcome with an orderbook
            for (const market of markets) {
                for (const outcome of market.outcomes) {
                    try {
                        console.info(`[Compliance] ${name}: fetching orderbook for outcome ${outcome.id} (${outcome.label})`);
                        orderbook = await exchange.fetchOrderBook(outcome.id);

                        // We need at least some data to validate consistency, but even empty is technically a valid structure
                        // However, for compliance testing, we want to see data if possible.
                        if (orderbook && (orderbook.bids.length > 0 || orderbook.asks.length > 0)) {
                            testedOutcomeId = outcome.id;
                            break;
                        }
                    } catch (error: any) {
                        console.warn(`[Compliance] ${name}: Failed to fetch orderbook for outcome ${outcome.id}: ${error.message}`);
                    }
                }
                if (testedOutcomeId) break;
            }

            // If we still don't have an orderbook with data, try the first one we got (even if empty)
            if (!testedOutcomeId && markets.length > 0 && markets[0].outcomes.length > 0) {
                const firstOutcome = markets[0].outcomes[0];
                orderbook = await exchange.fetchOrderBook(firstOutcome.id);
                testedOutcomeId = firstOutcome.id;
            }

            // Verify orderbook is returned
            expect(orderbook).toBeDefined();
            validateOrderBook(orderbook, name, testedOutcomeId);

        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchOrderBook not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
