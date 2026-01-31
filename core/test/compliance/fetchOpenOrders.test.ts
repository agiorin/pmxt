import { exchangeClasses, validateOrder } from './shared';

describe('Compliance: fetchOpenOrders', () => {
    test.each(exchangeClasses)('$name should comply with fetchOpenOrders standards', async ({ name, cls }) => {
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

            console.info(`[Compliance] Testing ${name}.fetchOpenOrders`);

            const orders = await exchange.fetchOpenOrders();

            expect(Array.isArray(orders)).toBe(true);

            for (const order of orders) {
                validateOrder(order, name);
            }

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchOpenOrders not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
