import { UnifiedMarket, MarketOutcome } from '../../src/types';

describe('Type Definitions', () => {
    describe('UnifiedMarket', () => {
        it('should have both id and marketId properties', () => {
            const market: UnifiedMarket = {
                id: 'test-market-123',
                marketId: 'test-market-123',
                title: 'Test Market',
                description: 'Test Description',
                outcomes: [],
                resolutionDate: new Date(),
                volume24h: 1000,
                liquidity: 500,
                url: 'https://example.com'
            };

            expect(market.id).toBe('test-market-123');
            expect(market.marketId).toBe('test-market-123');
            expect(market.id).toBe(market.marketId);
        });

        it('should allow id and marketId to have the same value', () => {
            const testId = '456789';
            const market: Partial<UnifiedMarket> = {
                id: testId,
                marketId: testId
            };

            expect(market.id).toEqual(market.marketId);
        });
    });

    describe('MarketOutcome', () => {
        it('should have both id and outcomeId properties', () => {
            const outcome: MarketOutcome = {
                id: '12345678901234',
                outcomeId: '12345678901234',
                label: 'Yes',
                price: 0.65
            };

            expect(outcome.id).toBe('12345678901234');
            expect(outcome.outcomeId).toBe('12345678901234');
            expect(outcome.id).toBe(outcome.outcomeId);
        });

        it('should allow id and outcomeId to have the same value', () => {
            const testId = '98765432109876';
            const outcome: Partial<MarketOutcome> = {
                id: testId,
                outcomeId: testId
            };

            expect(outcome.id).toEqual(outcome.outcomeId);
        });

        it('should support all properties', () => {
            const outcome: MarketOutcome = {
                id: 'token-123',
                outcomeId: 'token-123',
                label: 'No',
                price: 0.35,
                priceChange24h: -0.05,
                metadata: {
                    clobTokenId: 'token-123',
                    customField: 'value'
                }
            };

            expect(outcome.label).toBe('No');
            expect(outcome.price).toBe(0.35);
            expect(outcome.priceChange24h).toBe(-0.05);
            expect(outcome.metadata?.clobTokenId).toBe('token-123');
        });
    });
});
