import { exchangeClasses, validatePriceCandle } from './shared';

describe('Compliance: fetchOHLCV', () => {
    test.each(exchangeClasses)('$name should comply with fetchOHLCV standards', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            console.info(`[Compliance] Testing ${name}.fetchOHLCV`);

            // 1. Get a market to find an outcome ID
            const markets = await exchange.fetchMarkets({ limit: 1 });
            if (!markets || markets.length === 0) {
                throw new Error(`${name}: No markets found to test fetchOHLCV`);
            }

            const market = markets[0];
            let candles: any[] = [];
            let lastError: Error | undefined;

            // Try the first 3 outcomes to find one with history
            const outcomesToTest = market.outcomes.slice(0, 3);
            let testedOutcomeId = '';

            for (const outcome of outcomesToTest) {
                try {
                    console.info(`[Compliance] ${name}: fetching OHLCV for outcome ${outcome.id} (${outcome.label})`);
                    candles = await exchange.fetchOHLCV(outcome.id, {
                        resolution: '1h',
                        limit: 10
                    });
                    if (candles && candles.length > 0) {
                        testedOutcomeId = outcome.id;
                        break;
                    }
                } catch (error: any) {
                    lastError = error;
                    console.warn(`[Compliance] ${name}: Failed to fetch OHLCV for outcome ${outcome.id}: ${error.message}`);
                }
            }

            // Verify candles are returned
            expect(candles).toBeDefined();
            expect(Array.isArray(candles)).toBe(true);
            expect(candles.length).toBeGreaterThan(0);

            // 3. Validate candles
            for (const candle of candles) {
                validatePriceCandle(candle, name, testedOutcomeId);
            }

        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchOHLCV not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
