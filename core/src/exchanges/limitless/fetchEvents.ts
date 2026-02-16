import { EventFetchParams } from '../../BaseExchange';
import { UnifiedEvent, UnifiedMarket } from '../../types';
import axios from 'axios';
import { LIMITLESS_API_URL, mapMarketToUnified } from './utils';
import { limitlessErrorMapper } from './errors';

async function fetchEventBySlug(slug: string): Promise<UnifiedEvent | null> {
    const { HttpClient, MarketFetcher } = await import('@limitless-exchange/sdk');
    const httpClient = new HttpClient({ baseURL: LIMITLESS_API_URL });
    const marketFetcher = new MarketFetcher(httpClient);

    const market = await marketFetcher.getMarket(slug);
    if (!market) return null;

    let marketsList: UnifiedMarket[] = [];
    if (market.markets && Array.isArray(market.markets)) {
        marketsList = market.markets
            .map((child: any) => mapMarketToUnified(child))
            .filter((m: any): m is UnifiedMarket => m !== null);
    } else {
        const unifiedMarket = mapMarketToUnified(market);
        if (unifiedMarket) marketsList = [unifiedMarket];
    }

    return {
        id: market.slug,
        title: market.title || (market as any).question,
        description: market.description || '',
        slug: market.slug,
        markets: marketsList,
        url: `https://limitless.exchange/markets/${market.slug}`,
        image: (market as any).logo || `https://limitless.exchange/api/og?slug=${market.slug}`,
        category: market.categories?.[0],
        tags: market.tags || []
    } as UnifiedEvent;
}

export async function fetchEvents(params: EventFetchParams): Promise<UnifiedEvent[]> {
    try {
        // Handle eventId/slug lookup (same thing for Limitless)
        if (params.eventId || params.slug) {
            const slug = params.eventId || params.slug!;
            const event = await fetchEventBySlug(slug);
            return event ? [event] : [];
        }

        // NOTE: The Limitless /markets/search endpoint currently only returns active/funded markets.
        // It does not include expired or resolved markets in search results.
        // Consequently, status 'inactive' will likely return 0 results and 'all' will only show active markets.
        const response = await axios.get(`${LIMITLESS_API_URL}/markets/search`, {
            params: {
                query: params.query,
                limit: params?.limit || 10000,
                similarityThreshold: 0.5
            }
        });

        let markets = response.data?.markets || [];

        // Filter by status based on expired/resolved state
        // Active: not expired and not resolved
        // Inactive: expired OR resolved (has winningOutcomeIndex)
        const status = params?.status || 'active';
        if (status === 'active') {
            markets = markets.filter((m: any) => !m.expired && m.winningOutcomeIndex === null);
        } else if (status === 'inactive' || status === 'closed') {
            markets = markets.filter((m: any) => m.expired === true || m.winningOutcomeIndex !== null);
        }
        // If status === 'all', don't filter

        return markets.map((market: any) => {
            let marketsList: UnifiedMarket[] = [];

            if (market.markets && Array.isArray(market.markets)) {
                marketsList = market.markets
                    .map((child: any) => mapMarketToUnified(child))
                    .filter((m: any): m is UnifiedMarket => m !== null);
            } else {
                const unifiedMarket = mapMarketToUnified(market);
                if (unifiedMarket) marketsList = [unifiedMarket];
            }

            return {
                id: market.slug,
                title: market.title || market.question,
                description: market.description || '',
                slug: market.slug,
                markets: marketsList,
                url: `https://limitless.exchange/markets/${market.slug}`,
                image: market.logo || `https://limitless.exchange/api/og?slug=${market.slug}`,
                category: market.categories?.[0],
                tags: market.tags || []
            } as UnifiedEvent;
        });

    } catch (error: any) {
        throw limitlessErrorMapper.mapError(error);
    }
}
