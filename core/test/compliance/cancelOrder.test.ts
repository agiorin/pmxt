import { exchangeClasses } from './shared';

describe('Compliance: cancelOrder', () => {
    test.each(exchangeClasses)('$name should comply with cancelOrder standards', async ({ name, cls }) => {
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

            console.info(`[Compliance] Testing ${name}.cancelOrder`);

            // This will fail without real order ID + auth
            const orderIdToCancel = 'dummy-order-id';
            const cancelledOrder = await exchange.cancelOrder(orderIdToCancel);

            expect(cancelledOrder.id).toBeDefined();
            expect(['cancelled', 'canceled']).toContain(cancelledOrder.status);

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not implemented')) {
                console.info(`[Compliance] ${name}.cancelOrder not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
