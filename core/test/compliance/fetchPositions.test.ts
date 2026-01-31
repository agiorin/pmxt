import { exchangeClasses, validatePosition } from './shared';

describe('Compliance: fetchPositions', () => {
    test.each(exchangeClasses)('$name should comply with fetchPositions standards', async ({ name, cls }) => {
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

            console.info(`[Compliance] Testing ${name}.fetchPositions`);

            const positions = await exchange.fetchPositions();

            expect(Array.isArray(positions)).toBe(true);

            if (positions.length > 0) {
                for (const position of positions) {
                    validatePosition(position, name);
                }
            } else {
                // Warning or failure depending on strictness. 
                // But generally, returning [] is valid if no positions.
                // We just can't verify the structure.
                if (positions === undefined) {
                    throw new Error(`[Compliance] ${name}: fetchPositions returned undefined.`);
                }
            }

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchPositions not implemented.`);
                return;
            }
            throw error;
        }
    }, 60000);
});
