import { UnifiedMarket, MarketOutcome, CandleInterval } from '../../types';
import { addBinaryOutcomes } from '../../utils/market-utils';

export const LIMITLESS_API_URL = 'https://api.limitless.exchange';

export function mapMarketToUnified(market: any): UnifiedMarket | null {
    if (!market) return null;

    const outcomes: MarketOutcome[] = [];

    // The new API provides 'tokens' and 'prices'
    // tokens: { no: "...", yes: "..." }
    // prices: [noPrice, yesPrice]
    if (market.tokens) {
        const tokenEntries = Object.entries(market.tokens);
        // Ensure prices array exists, otherwise default to empty
        const prices = Array.isArray(market.prices) ? market.prices : [];
        
        tokenEntries.forEach(([label, tokenId], index) => {
            const outcomePrice = prices[index] || 0;
            const outcomeIdValue = tokenId as string;

            outcomes.push({
                outcomeId: outcomeIdValue,
                label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalize 'yes'/'no'
                price: outcomePrice,
                priceChange24h: 0, // Not directly available in this flat list, can be computed if needed
                metadata: {
                    clobTokenId: tokenId as string
                }
            });
        });
    }

    const um = {
        id: market.slug,
        marketId: market.slug,
        title: market.title || market.question,
        description: market.description,
        outcomes: outcomes,
        resolutionDate: market.expirationTimestamp ? new Date(market.expirationTimestamp) : new Date(),
        volume24h: Number(market.volumeFormatted || 0),
        volume: Number(market.volume || 0),
        liquidity: 0, // Not directly in the flat market list
        openInterest: 0, // Not directly in the flat market list
        url: `https://limitless.exchange/markets/${market.slug}`,
        image: market.logo || `https://limitless.exchange/api/og?slug=${market.slug}`,
        category: market.categories?.[0],
        tags: market.tags || []
    } as UnifiedMarket;

    addBinaryOutcomes(um);
    return um;
}

export function mapIntervalToFidelity(interval: CandleInterval): number {
    const mapping: Record<CandleInterval, number> = {
        '1m': 1,
        '5m': 5,
        '15m': 15,
        '1h': 60,
        '6h': 360,
        '1d': 1440
    };
    return mapping[interval];
}
