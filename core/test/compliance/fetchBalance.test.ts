import { exchangeClasses } from './shared';

describe('Compliance: fetchBalance', () => {
    test.each(exchangeClasses)('$name should comply with fetchBalance standards', async ({ name, cls }) => {
        let exchange: any;

        try {
            // Initialize with environment variables if available
            if (name === 'PolymarketExchange') {
                const pk = process.env.POLYMARKET_PRIVATE_KEY;
                // Only init if we have a key, or try with dummy to see it fail?
                // The user wants to confirm it FAILS "if no relevant data is found" (which implies auth failure).
                // So we init with what we have. If undefined, the exchange might throw or work in read-only.
                // But fetchBalance is private.
                if (pk) {
                    exchange = new cls({ privateKey: pk });
                } else {
                    exchange = new cls(); // Public only
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

            console.info(`[Compliance] Testing ${name}.fetchBalance`);

            // Real call execution
            const balances = await exchange.fetchBalance();

            // Verification
            expect(Array.isArray(balances)).toBe(true);

            if (balances.length > 0) {
                for (const balance of balances) {
                    expect(balance.currency).toBeDefined();
                    expect(typeof balance.total).toBe('number');
                    expect(typeof balance.available).toBe('number');
                    expect(typeof balance.locked).toBe('number');
                    expect(balance.total).toBeGreaterThanOrEqual(0);
                }
            } else {
                // If the array is empty, it's technically a valid return (no balances),
                // but usually implies we couldn't verify the structure fully.
                // However, without mocks, we accept empty array or throw if it's undefined.
                if (balances === undefined) {
                    throw new Error(`[Compliance] ${name}: fetchBalance returned undefined.`);
                }
            }

        } catch (error: any) {
            const msg = error.message.toLowerCase();
            if (msg.includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchBalance not implemented.`);
                return;
            }
            // If it fails due to auth, let it fail.
            throw error;
        }
    }, 60000);
});
