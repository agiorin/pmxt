import { exchangeClasses, validateOrder } from './shared';

describe('Compliance: createOrder', () => {
    test.each(exchangeClasses)('$name should comply with createOrder standards', async ({ name, cls }) => {
        let exchange: any;

        try {
            if (name === 'PolymarketExchange') {
                const pk = process.env.POLYMARKET_PRIVATE_KEY;
                if (pk) {
                    exchange = new cls({ privateKey: pk });
                } else {
                    exchange = new cls();
                }
            } else if (name === 'KalshiExchange') {
                exchange = new cls({
                    apiKey: process.env.KALSHI_API_KEY,
                    privateKey: process.env.KALSHI_PRIVATE_KEY
                });
            } else if (name === 'LimitlessExchange') {
                const pk = process.env.LIMITLESS_PRIVATE_KEY;
                if (pk) {
                    exchange = new cls({ privateKey: pk });
                } else {
                    exchange = new cls();
                }
            } else {
                exchange = new cls();
            }

            console.info(`[Compliance] Testing ${name}.createOrder`);

            // We use a dummy order that is likely to fail validation or execution
            // but structure-wise it's correct.
            const orderParams = {
                marketId: 'mock-market-id', // Real execution will likely fail ID validation first
                outcomeId: 'mock-outcome-id',
                side: 'buy' as const,
                type: 'limit' as const,
                amount: 1,
                price: 0.01 // Very low price
            };

            // This SHOULD throw if unauthorized or invalid ID
            const order = await exchange.createOrder(orderParams);

            // If it somehow succeeds (e.g. valid keys + lucky IDs? improbable), valid structure
            validateOrder(order, name);

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not implemented')) {
                console.info(`[Compliance] ${name}.createOrder not implemented.`);
                return;
            }

            // Expected failure path for un-authed / invalid ID
            // BUT, the test is: "Fail if no relevant data found" -> which essentially means
            // "We want to know if it works". If it throws, the test FAILS.
            // So we re-throw.
            throw error;
        }
    }, 60000);
});
