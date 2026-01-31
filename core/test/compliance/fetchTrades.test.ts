import { exchangeClasses, validateTrade } from './shared';

describe('Compliance: fetchTrades', () => {
    test.each(exchangeClasses)('$name should comply with fetchTrades standards', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            console.info(`[Compliance] Testing ${name}.fetchTrades`);

            // 1. Get a market to find an outcome ID
            const markets = await exchange.fetchMarkets({ limit: 5 });
            if (!markets || markets.length === 0) {
                throw new Error(`${name}: No markets found to test fetchTrades`);
            }

            let trades: any[] = [];
            let testedOutcomeId = '';

            // Try to find an outcome with trades
            for (const market of markets) {
                for (const outcome of market.outcomes) {
                    try {
                        console.info(`[Compliance] ${name}: fetching trades for outcome ${outcome.id} (${outcome.label})`);
                        trades = await exchange.fetchTrades(outcome.id, { resolution: '1h', limit: 10 });

                        if (trades && trades.length > 0) {
                            testedOutcomeId = outcome.id;
                            break;
                        }
                    } catch (error: any) {
                        console.warn(`[Compliance] ${name}: Failed to fetch trades for outcome ${outcome.id}: ${error.message}`);
                    }
                }
                if (testedOutcomeId) break;
            }

            // If we still don't have trades, try the first one we got (even if empty)
            if (!testedOutcomeId && markets.length > 0 && markets[0].outcomes.length > 0) {
                const firstOutcome = markets[0].outcomes[0];
                trades = await exchange.fetchTrades(firstOutcome.id, { resolution: '1h', limit: 10 });
                testedOutcomeId = firstOutcome.id;
            }

            // Verify trades is returned (can be empty if market is new, but structure must match)
            expect(Array.isArray(trades)).toBe(true);

            if (trades.length > 0) {
                for (const trade of trades) {
                    validateTrade(trade, name, testedOutcomeId);
                }
            } else {
                console.info(`[Compliance] ${name}: No trades found for outcome ${testedOutcomeId}, but structure is valid.`);
            }

        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchTrades not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
