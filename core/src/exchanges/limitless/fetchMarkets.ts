import axios from 'axios';
import { MarketFetchParams } from '../../BaseExchange';
import { UnifiedMarket } from '../../types';
import { LIMITLESS_API_URL, mapMarketToUnified } from './utils';
import { limitlessErrorMapper } from './errors';

export async function fetchMarkets(params?: MarketFetchParams): Promise<UnifiedMarket[]> {
    try {
        // Handle slug-based lookup
        if (params?.slug) {
            return await fetchMarketsBySlug(params.slug);
        }

        // Handle query-based search
        if (params?.query) {
            return await searchMarkets(params.query, params);
        }

        // Default: fetch markets
        return await fetchMarketsDefault(params);
    } catch (error: any) {
        throw limitlessErrorMapper.mapError(error);
    }
}

async function fetchMarketsBySlug(slug: string): Promise<UnifiedMarket[]> {
    const response = await axios.get(`${LIMITLESS_API_URL}/markets/${slug}`);
    const market = response.data;

    if (!market) return [];

    const unifiedMarket = mapMarketToUnified(market);
    return unifiedMarket ? [unifiedMarket] : [];
}

async function searchMarkets(query: string, params?: MarketFetchParams): Promise<UnifiedMarket[]> {
    const response = await axios.get(`${LIMITLESS_API_URL}/markets/search`, {
        params: {
            query: query,
            limit: params?.limit || 20
        }
    });

    const rawResults = response.data?.markets || [];
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

async function fetchMarketsDefault(params?: MarketFetchParams): Promise<UnifiedMarket[]> {
    const limit = params?.limit || 200;
    const offset = params?.offset || 0;

    // The new API endpoint is /markets/active
    const url = `${LIMITLESS_API_URL}/markets/active`;

    try {
        const response = await axios.get(url);
        const markets = response.data?.data || response.data;

        if (!markets || !Array.isArray(markets)) {
            return [];
        }

        const unifiedMarkets: UnifiedMarket[] = [];

        for (const market of markets) {
            const unifiedMarket = mapMarketToUnified(market);
            // Only include markets that are valid and have outcomes (compliance requirement)
            if (unifiedMarket && unifiedMarket.outcomes.length > 0) {
                unifiedMarkets.push(unifiedMarket);
            }
        }

        // Apply filtering if needed (e.g. by category or volume)
        // Note: The new API returns ~350 markets, so we can filter and sort locally

        if (params?.sort === 'volume') {
            unifiedMarkets.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
        } else {
            // Default volume sort
            unifiedMarkets.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
        }

        return unifiedMarkets.slice(offset, offset + limit);

    } catch (error: any) {
        throw limitlessErrorMapper.mapError(error);
    }
}
