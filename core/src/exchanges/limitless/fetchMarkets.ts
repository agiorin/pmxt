import { HttpClient, MarketFetcher } from '@limitless-exchange/sdk';
import { MarketFetchParams } from '../../BaseExchange';
import { UnifiedMarket } from '../../types';
import axios from 'axios';
import { LIMITLESS_API_URL, mapMarketToUnified } from './utils';
import { limitlessErrorMapper } from './errors';

export async function fetchMarkets(
    params?: MarketFetchParams,
    apiKey?: string
): Promise<UnifiedMarket[]> {
    try {
        // Create HTTP client (no auth needed for market data)
        const httpClient = new HttpClient({
            baseURL: LIMITLESS_API_URL,
            apiKey: apiKey, // Optional - not required for public market data
        });

        const marketFetcher = new MarketFetcher(httpClient);

        // Handle slug-based lookup
        if (params?.slug) {
            return await fetchMarketsBySlug(marketFetcher, params.slug);
        }

        // Handle query-based search
        if (params?.query) {
            return await searchMarkets(marketFetcher, params.query, params);
        }

        // Default: fetch active markets
        return await fetchMarketsDefault(marketFetcher, params);
    } catch (error: any) {
        throw limitlessErrorMapper.mapError(error);
    }
}

async function fetchMarketsBySlug(
    marketFetcher: MarketFetcher,
    slug: string
): Promise<UnifiedMarket[]> {
    const market = await marketFetcher.getMarket(slug);

    if (!market) return [];

    const unifiedMarket = mapMarketToUnified(market);
    return unifiedMarket ? [unifiedMarket] : [];
}

async function searchMarkets(
    marketFetcher: MarketFetcher,
    query: string,
    params?: MarketFetchParams
): Promise<UnifiedMarket[]> {
    // SDK doesn't have a search method yet, use axios directly

    const response = await axios.get(`${LIMITLESS_API_URL}/markets/search`, {
        params: {
            query: query,
            limit: params?.limit || 20,
            page: params?.page || 1,
            similarityThreshold: params?.similarityThreshold || 0.5
        }
    });

    const rawResults = response?.data?.markets || [];
    const allMarkets: UnifiedMarket[] = [];

    for (const res of rawResults) {
        if (res.markets && Array.isArray(res.markets)) {
            // It's a group market, extract individual markets
            for (const child of res.markets) {
                const mapped = mapMarketToUnified(child);
                if (mapped) allMarkets.push(mapped);
            }
        } else {
            const mapped = mapMarketToUnified(res);
            if (mapped) allMarkets.push(mapped);
        }
    }

    return allMarkets
        .filter((m: any): m is UnifiedMarket => m !== null && m.outcomes.length > 0)
        .slice(0, params?.limit || 20);
}

async function fetchMarketsDefault(
    marketFetcher: MarketFetcher,
    params?: MarketFetchParams
): Promise<UnifiedMarket[]> {
    const limit = params?.limit || 200;
    const offset = params?.offset || 0;

    // Map sort parameter to SDK's sortBy
    let sortBy: 'lp_rewards' | 'ending_soon' | 'newest' | 'high_value' = 'lp_rewards';
    if (params?.sort === 'volume') {
        sortBy = 'high_value';
    }

    // Calculate page number from offset
    const page = Math.floor(offset / limit) + 1;

    try {
        // Use SDK's getActiveMarkets method
        const response = await marketFetcher.getActiveMarkets({
            limit: limit,
            page: page,
            sortBy: sortBy,
        });

        const markets = response.data || [];

        const unifiedMarkets: UnifiedMarket[] = [];

        for (const market of markets) {
            const unifiedMarket = mapMarketToUnified(market);
            // Only include markets that are valid and have outcomes (compliance requirement)
            if (unifiedMarket && unifiedMarket.outcomes.length > 0) {
                unifiedMarkets.push(unifiedMarket);
            }
        }

        // If local sorting is needed (SDK already sorts by sortBy parameter)
        if (params?.sort === 'volume') {
            unifiedMarkets.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
        }

        return unifiedMarkets;
    } catch (error: any) {
        throw limitlessErrorMapper.mapError(error);
    }
}
