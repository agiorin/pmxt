import { exchangeClasses, validateOrderBook } from './shared';

describe('Compliance: watchOrderBook', () => {
    test.each(exchangeClasses)('$name should comply with watchOrderBook standards', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            console.info(`[Compliance] Testing ${name}.watchOrderBook`);

            // 1. Get a market to find an outcome ID
            // We need a market that is likely active to ensure orderbook data exists
            const markets = await exchange.fetchMarkets({ limit: 20 });
            if (!markets || markets.length === 0) {
                // Failure over warning policy
                throw new Error(`${name}: No markets found to test watchOrderBook`);
            }

            let orderbook: any;
            let testedOutcomeId = '';
            let marketFound = false;

            // Try to find an outcome that works
            // For watchOrderBook, we just need one successful subscription verification
            // We'll try a few markets until we find one that doesn't error and returns data
            for (const market of markets) {
                for (const outcome of market.outcomes) {
                    try {
                        console.info(`[Compliance] ${name}: watching orderbook for outcome ${outcome.id} (${outcome.label})`);

                        // Set a timeout for the watch operation to avoid hanging tests indefinitely
                        // if the stream doesn't send data.
                        const watchPromise = exchange.watchOrderBook(outcome.id);
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout waiting for watchOrderBook data')), 10000)
                        );

                        orderbook = await Promise.race([watchPromise, timeoutPromise]);

                        if (orderbook) {
                            testedOutcomeId = outcome.id;
                            marketFound = true;
                            break;
                        }
                    } catch (error: any) {
                        const msg = error.message.toLowerCase();
                        if (msg.includes('not supported') || msg.includes('not implemented') || msg.includes('unavailable') || msg.includes('authentication') || msg.includes('credentials')) {
                            // If it's not implemented or requires auth we don't have, we can stop
                            throw error;
                        }
                        console.warn(`[Compliance] ${name}: Failed to watch orderbook for outcome ${outcome.id}: ${error.message}`);
                    }
                }
                if (marketFound) break;
            }

            if (!marketFound) {
                // If we tried all markets and none worked (but weren't "not implemented" errors), fail.
                // Unless the exchange generally supports it but maybe no active markets?
                // But per policy "Failure over Warning", we should probably fail if we can't verify compliance.
                throw new Error(`${name}: Failed to watch orderbook on any of the fetched markets`);
            }

            // Verify orderbook structure
            expect(orderbook).toBeDefined();
            validateOrderBook(orderbook, name, testedOutcomeId);

            // Test continuous updates?
            // For compliance, verifying the first snapshot/update is usually sufficient to prove the method works.
            // Full integration tests might test strict real-time updates.

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not supported') || msg.includes('not implemented') || msg.includes('unavailable') || msg.includes('authentication') || msg.includes('credentials')) {
                console.info(`[Compliance] ${name}.watchOrderBook not implemented, unavailable, or requires missing auth.`);
                return;
            }
            throw error;
        } finally {
            // CRITICAL: Close the exchange to kill WebSocket connections
            await exchange.close();
        }
    }, 60000); // 60s timeout for the test
});
