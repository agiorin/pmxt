import { MarketFilterParams } from '../../BaseExchange';
import { UnifiedEvent, UnifiedMarket } from '../../types';
import axios from 'axios';
import { LIMITLESS_API_URL, mapMarketToUnified } from './utils';

export async function searchEvents(query: string, params?: MarketFilterParams): Promise<UnifiedEvent[]> {
    try {
        const response = await axios.get(`${LIMITLESS_API_URL}/markets/search`, {
            params: {
                query: query,
                limit: params?.limit || 20
            }
        });

        const markets = response.data?.markets || [];

        return markets.map((market: any) => {
            const unifiedMarket = mapMarketToUnified(market);
            const marketsList: UnifiedMarket[] = unifiedMarket ? [unifiedMarket] : [];

            return {
                id: market.slug,
                title: market.title || market.question,
                description: market.description || '',
                slug: market.slug,
                markets: marketsList,
                url: `https://limitless.exchange/markets/${market.slug}`,
                image: market.logo || `https://limitless.exchange/api/og?slug=${market.slug}`,
                category: market.categories?.[0],
                tags: market.tags || [],
                searchMarkets: function (marketQuery: string): UnifiedMarket[] {
                    const lowerMarketQuery = marketQuery.toLowerCase();
                    return this.markets.filter(m =>
                        m.title.toLowerCase().includes(lowerMarketQuery) ||
                        m.description.toLowerCase().includes(lowerMarketQuery)
                    );
                }
            } as UnifiedEvent;
        });

    } catch (error: any) {
        console.error("Error searching Limitless events:", error.message);
        return [];
    }
}
