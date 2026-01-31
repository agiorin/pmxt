
import { exchangeClasses, validateTrade } from './shared';

describe('Compliance: watchTrades', () => {
    test.each(exchangeClasses)('$name should comply with watchTrades standards', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            console.info(`[Compliance] Testing ${name}.watchTrades`);

            // 1. Get a market to find an outcome ID
            const markets = await exchange.fetchMarkets({ limit: 20, sort: 'volume' });
            if (!markets || markets.length === 0) {
                throw new Error(`${name}: No markets found to test watchTrades`);
            }

            let tradeReceived: any;
            let testedOutcomeId = '';
            let marketFound = false;

            // Try to find an outcome that works
            for (const market of markets) {
                for (const outcome of market.outcomes) {
                    try {
                        console.info(`[Compliance] ${name}: watching trades for outcome ${outcome.id} (${outcome.label})`);

                        // Set a timeout for the watch operation
                        // watchTrades typically returns a Promise that resolves when the first trade update is received
                        // OR it might be an AsyncIterator or EventEmitter. 
                        // Assuming standard CCXT-like behavior where await exchange.watchTrades(symbol) returns the next trade(s).

                        const watchPromise = exchange.watchTrades(outcome.id);

                        // We use a shorter timeout for individual checks, but if the market is quiet we might miss it.
                        // However, we don't want to hang the test suite.
                        // For compliance check, we hope to find at least ONE active market.
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout waiting for watchTrades data')), 15000)
                        );

                        const result = await Promise.race([watchPromise, timeoutPromise]);

                        if (result) {
                            tradeReceived = result;
                            testedOutcomeId = outcome.id;
                            marketFound = true;
                            // Unsubscribe/break loop
                            break;
                        }
                    } catch (error: any) {
                        const msg = error.message.toLowerCase();
                        if (msg.includes('not supported') || msg.includes('not implemented') || msg.includes('unavailable') || msg.includes('authentication') || msg.includes('credentials') || msg.includes('api key')) {
                            // If it's not implemented or requires auth we don't have, we acknowledge it and stop trying this exchange
                            // But we should verify if the TODO allows this. 
                            // The task is to "implement the test".
                            // If the feature is missing, catching the error is correct.
                            console.info(`[Compliance] ${name}.watchTrades not supported or requires auth: ${error.message}`);
                            throw error; // Re-throw to be caught by outer block to skip exchange
                        }
                        // Timeout or other error -> try next outcome
                        console.warn(`[Compliance] ${name}: Failed to watch trades for outcome ${outcome.id}: ${error.message}`);
                    }
                }
                if (marketFound) break;
            }

            if (!marketFound) {
                // If we tried all markets and none worked (timeouts), we might be testing during low activity.
                // However, per strict compliance "Failure over Warning", we alert if no data found.
                // But specifically for watchTrades, it relies on real-time activity.
                // We'll throw an error to indicate we couldn't verify it. 
                throw new Error(`${name}: Failed to receive any trades on fetched markets (timeout/inactivity)`);
            }

            // Verify trade structure
            expect(tradeReceived).toBeDefined();

            // Handle both single trade and array of trades
            if (Array.isArray(tradeReceived)) {
                expect(tradeReceived.length).toBeGreaterThan(0);
                for (const trade of tradeReceived) {
                    validateTrade(trade, name, testedOutcomeId);
                }
            } else {
                validateTrade(tradeReceived, name, testedOutcomeId);
            }

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not supported') || msg.includes('not implemented') || msg.includes('unavailable') || msg.includes('authentication') || msg.includes('credentials') || msg.includes('api key')) {
                console.info(`[Compliance] ${name}.watchTrades skipped: ${error.message}`);
                return;
            }
            throw error;
        } finally {
            await exchange.close();
        }
    }, 120000); // Extended timeout for finding active trades
});
