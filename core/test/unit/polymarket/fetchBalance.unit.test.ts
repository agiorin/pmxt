import { PolymarketExchange } from '../../../src/exchanges/polymarket';
import { AuthenticationError } from '../../../src/errors';

/**
 * Regression coverage for issue #72.
 *
 * The bundled @polymarket/clob-client swallows HTTP errors inside its request
 * helpers and returns an envelope shaped like { error, status } instead of
 * throwing. Inside getOpenOrders, that envelope causes
 *
 *     results = [...results, ...response.data];
 *
 * to throw "response.data is not iterable". Before this fix the TypeError was
 * surfaced verbatim to users via _parse_api_exception, masking the real
 * upstream cause (typically: wallet not onboarded with Polymarket).
 */
describe('PolymarketExchange: fetchBalance unit tests', () => {
    let exchange: PolymarketExchange;

    beforeEach(() => {
        exchange = new PolymarketExchange({
            privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
        });
    });

    function installMockClient(mock: {
        getBalanceAllowance?: jest.Mock;
        getOpenOrders?: jest.Mock;
        getEffectiveFunderAddress?: jest.Mock;
    }) {
        (exchange as any).ensureAuth = () => ({
            getClobClient: () => Promise.resolve({
                getBalanceAllowance: mock.getBalanceAllowance ?? jest.fn().mockResolvedValue({ balance: '0', allowance: '0' }),
                getOpenOrders: mock.getOpenOrders ?? jest.fn().mockResolvedValue([]),
            }),
            getEffectiveFunderAddress: mock.getEffectiveFunderAddress
                ?? jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000'),
        });
        // Stub on-chain fallback so unit tests don't hit RPC.
        (exchange as any).getAddressOnChainBalance = jest.fn().mockResolvedValue([
            { currency: 'USDC', total: 0, available: 0, locked: 0 },
        ]);
    }

    it('returns parsed CLOB balance when getOpenOrders returns an empty array', async () => {
        installMockClient({
            getBalanceAllowance: jest.fn().mockResolvedValue({ balance: '12500000', allowance: '0' }),
            getOpenOrders: jest.fn().mockResolvedValue([]),
        });

        const balances = await exchange.fetchBalance();

        expect(balances).toHaveLength(1);
        expect(balances[0].currency).toBe('USDC');
        expect(balances[0].total).toBeCloseTo(12.5);
        expect(balances[0].available).toBeCloseTo(12.5);
        expect(balances[0].locked).toBe(0);
    });

    it('throws AuthenticationError instead of "response.data is not iterable" (issue #72)', async () => {
        // Reproduce the upstream clob-client failure mode: a TypeError that
        // bubbles up from inside the library when it tries to spread an error
        // envelope as if it were a paginated success response.
        const iterableError = new TypeError('response.data is not iterable');
        installMockClient({
            getBalanceAllowance: jest.fn().mockResolvedValue({ balance: '0', allowance: '0' }),
            getOpenOrders: jest.fn().mockRejectedValue(iterableError),
        });

        await expect(exchange.fetchBalance()).rejects.toBeInstanceOf(AuthenticationError);
        await expect(exchange.fetchBalance()).rejects.toMatchObject({
            exchange: 'Polymarket',
            message: expect.stringContaining('Polymarket CLOB rejected the request to list open orders'),
        });
    });

    it('falls back to on-chain balance when getBalanceAllowance returns the clob-client error envelope', async () => {
        // Simulate the swallowed-HTTP-error envelope shape produced by
        // @polymarket/clob-client http-helpers.
        const envelope = { error: 'unauthorized', status: 401 };
        installMockClient({
            getBalanceAllowance: jest.fn().mockResolvedValue(envelope),
            getOpenOrders: jest.fn().mockResolvedValue([]),
        });
        (exchange as any).getAddressOnChainBalance = jest.fn().mockResolvedValue([
            { currency: 'USDC', total: 42, available: 42, locked: 0 },
        ]);

        const balances = await exchange.fetchBalance();

        expect(balances[0].total).toBe(42);
        expect(balances[0].available).toBe(42);
        expect(balances[0].locked).toBe(0);
    });

    it('computes locked funds from open BUY orders', async () => {
        installMockClient({
            getBalanceAllowance: jest.fn().mockResolvedValue({ balance: '100000000', allowance: '0' }), // 100 USDC
            getOpenOrders: jest.fn().mockResolvedValue([
                { side: 'BUY', original_size: '10', size_matched: '4', price: '0.5' }, // remaining 6 * 0.5 = 3
                { side: 'BUY', original_size: '20', size_matched: '0', price: '0.25' }, // 20 * 0.25 = 5
                { side: 'SELL', original_size: '50', size_matched: '0', price: '0.9' }, // ignored
            ]),
        });

        const balances = await exchange.fetchBalance();

        expect(balances[0].total).toBeCloseTo(100);
        expect(balances[0].locked).toBeCloseTo(8);
        expect(balances[0].available).toBeCloseTo(92);
    });
});
