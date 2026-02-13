import axios from 'axios';
import { MarketFetchParams } from '../../BaseExchange';
import { UnifiedMarket } from '../../types';
import { KALSHI_API_URL, KALSHI_SERIES_URL, mapMarketToUnified } from './utils';
import { kalshiErrorMapper } from './errors';

// Aggressive caching for Kalshi since we can't parallelize cursor-based pagination
let globalMarketCache: Record<string, UnifiedMarket[]> = {};
let globalSeriesMap: Map<string, string[]> | null = null;
let lastCacheTime: Record<string, number> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Export a function to reset the cache (useful for testing)
export function resetCache(): void {
    globalMarketCache = {};
    globalSeriesMap = null;
    lastCacheTime = {};
}

async function fetchSeriesMap(): Promise<Map<string, string[]>> {
    try {
        const response = await axios.get(KALSHI_SERIES_URL);
        const seriesList = response.data.series || [];
        const map = new Map<string, string[]>();
        for (const series of seriesList) {
            if (series.tags && series.tags.length > 0) {
                map.set(series.ticker, series.tags);
            }
        }
        return map;
    } catch (e: any) {
        throw kalshiErrorMapper.mapError(e);
    }
}

async function fetchAllActiveMarkets(status: string = 'open'): Promise<UnifiedMarket[]> {
    const now = Date.now();

    // Check if we have valid cached data for this specific status
    if (globalMarketCache[status] && globalSeriesMap && (now - (lastCacheTime[status] || 0) < CACHE_TTL)) {
        return globalMarketCache[status];
    }

    // Fetch series map and events in parallel (series map doesn't use cursor)
    const seriesMapPromise = fetchSeriesMap();

    // Fetch all events using cursor-based pagination (sequential, but optimized)
    let allEvents: any[] = [];
    let cursor = null;
    let page = 0;
    let totalMarkets = 0;
    const MAX_PAGES = 100; // Safety cap
    const BATCH_SIZE = 200; // Max limit per Kalshi API

    do {
        try {
            const queryParams: any = {
                limit: BATCH_SIZE,
                with_nested_markets: true,
                status: status
            };
            if (cursor) queryParams.cursor = cursor;

            const response = await axios.get(KALSHI_API_URL, { params: queryParams });
            const events = response.data.events || [];

            if (events.length === 0) break;

            allEvents = allEvents.concat(events);
            cursor = response.data.cursor;
            page++;

            // Smart early termination: count markets and stop when we have enough
            // For search, we want ~5000 markets. Use 1.5x for buffer after filtering.
            for (const event of events) {
                totalMarkets += (event.markets || []).length;
            }

            if (totalMarkets >= 7500) { // 5000 * 1.5
                break;
            }

        } catch (e: any) {
            throw kalshiErrorMapper.mapError(e);
        }
    } while (cursor && page < MAX_PAGES);

    // Wait for series map
    const seriesMap = await seriesMapPromise;

    // Extract ALL markets from all events
    const allMarkets: UnifiedMarket[] = [];

    for (const event of allEvents) {
        // Enrich event with tags from Series
        if (event.series_ticker && seriesMap.has(event.series_ticker)) {
            if (!event.tags || event.tags.length === 0) {
                event.tags = seriesMap.get(event.series_ticker);
            }
        }

        const markets = event.markets || [];
        for (const market of markets) {
            const unifiedMarket = mapMarketToUnified(event, market);
            if (unifiedMarket) {
                allMarkets.push(unifiedMarket);
            }
        }
    }

    // Cache the results
    globalMarketCache[status] = allMarkets;
    globalSeriesMap = seriesMap;
    lastCacheTime[status] = now;

    return allMarkets;
}

export async function fetchMarkets(params?: MarketFetchParams): Promise<UnifiedMarket[]> {
    try {
        // Handle slug-based lookup (direct API call, no cache)
        if (params?.slug) {
            return await fetchMarketsBySlug(params.slug);
        }

        // Handle query-based search with native API
        if (params?.query) {
            try {
                return await searchMarketsNative(params.query, params);
            } catch (error) {
                // Fallback to cached search if native fails
                console.warn('[Kalshi] Falling back to cached search');
                const status = params?.status || 'active';
                const apiStatus = status === 'closed' ? 'closed' : 'open';
                const allMarkets = await fetchAllActiveMarkets(apiStatus);
                return searchMarkets(allMarkets, params.query, params);
            }
        }

        // Default: fetch markets using cache
        const status = params?.status || 'active';
        const apiStatus = status === 'closed' ? 'closed' : 'open';
        const allMarkets = await fetchAllActiveMarkets(apiStatus);
        return applyFiltersAndPagination(allMarkets, params);

    } catch (error: any) {
        throw kalshiErrorMapper.mapError(error);
    }
}

async function fetchMarketsBySlug(eventTicker: string): Promise<UnifiedMarket[]> {
    const normalizedTicker = eventTicker.toUpperCase();
    const url = `https://api.elections.kalshi.com/trade-api/v2/events/${normalizedTicker}`;
    const response = await axios.get(url, {
        params: { with_nested_markets: true }
    });

    const event = response.data.event;
    if (!event) return [];

    // Enrichment: Fetch series tags if they exist
    if (event.series_ticker) {
        try {
            const seriesUrl = `${KALSHI_SERIES_URL}/${event.series_ticker}`;
            const seriesResponse = await axios.get(seriesUrl);
            const series = seriesResponse.data.series;
            if (series && series.tags && series.tags.length > 0) {
                if (!event.tags || event.tags.length === 0) {
                    event.tags = series.tags;
                }
            }
        } catch (e) {
            // Ignore errors fetching series info - non-critical
        }
    }

    const unifiedMarkets: UnifiedMarket[] = [];
    const markets = event.markets || [];

    for (const market of markets) {
        const unifiedMarket = mapMarketToUnified(event, market);
        if (unifiedMarket) {
            unifiedMarkets.push(unifiedMarket);
        }
    }

    return unifiedMarkets;
}

async function searchMarketsNative(query: string, params?: MarketFetchParams): Promise<UnifiedMarket[]> {
    // Use Kalshi's native search on the markets endpoint for massive speedup
    const marketsUrl = 'https://api.elections.kalshi.com/trade-api/v2/markets';

    try {
        const response = await axios.get(marketsUrl, {
            params: {
                q: query,
                limit: params?.limit || 20,
                status: params?.status === 'closed' ? 'closed' : 'open'
            }
        });

        const markets = response.data.markets || [];

        // We need to enrich markets with event data
        // Fetch the parent events to get titles and tags
        const eventTickers = [...new Set(markets.map((m: any) => m.event_ticker))];

        // Fetch events in parallel (much faster than serial)
        const eventsUrl = 'https://api.elections.kalshi.com/trade-api/v2/events';
        const eventPromises = eventTickers.map(ticker =>
            axios.get(`${eventsUrl}/${ticker}`).catch(() => null)
        );

        const eventResponses = await Promise.all(eventPromises);
        const eventsMap = new Map();

        for (const res of eventResponses) {
            if (res?.data?.event) {
                eventsMap.set(res.data.event.event_ticker, res.data.event);
            }
        }

        // Map to unified format
        const unifiedMarkets: UnifiedMarket[] = [];
        for (const market of markets) {
            const event = eventsMap.get(market.event_ticker);
            if (event) {
                const unifiedMarket = mapMarketToUnified(event, market);
                if (unifiedMarket) {
                    unifiedMarkets.push(unifiedMarket);
                }
            }
        }

        return applyFiltersAndPagination(unifiedMarkets, params);

    } catch (error: any) {
        // Fallback to cached search if native search fails
        console.warn('[Kalshi] Native search failed, falling back to cached search');
        throw error; // Let the caller handle this
    }
}

function searchMarkets(allMarkets: UnifiedMarket[], query: string, params?: MarketFetchParams): UnifiedMarket[] {
    const lowerQuery = query.toLowerCase();
    const searchIn = params?.searchIn || 'title';

    const filtered = allMarkets.filter(market => {
        const titleMatch = (market.title || '').toLowerCase().includes(lowerQuery);
        const descMatch = (market.description || '').toLowerCase().includes(lowerQuery);

        if (searchIn === 'title') return titleMatch;
        if (searchIn === 'description') return descMatch;
        return titleMatch || descMatch;
    });

    return applyFiltersAndPagination(filtered, params);
}

function applyFiltersAndPagination(markets: UnifiedMarket[], params?: MarketFetchParams): UnifiedMarket[] {
    let result = [...markets];

    // Sort
    if (params?.sort === 'volume') {
        result.sort((a, b) => b.volume24h - a.volume24h);
    } else if (params?.sort === 'liquidity') {
        result.sort((a, b) => b.liquidity - a.liquidity);
    } else if (params?.sort === 'newest') {
        result.sort((a, b) => b.resolutionDate.getTime() - a.resolutionDate.getTime());
    }

    // Pagination
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    return result.slice(offset, offset + limit);
}

