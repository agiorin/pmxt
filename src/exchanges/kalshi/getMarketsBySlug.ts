import axios from 'axios';
import { UnifiedMarket } from '../../types';
import { mapMarketToUnified } from './utils';

/**
 * Fetch specific markets by their event ticker.
 * Useful for looking up a specific event from a URL.
 * @param eventTicker - The event ticker (e.g. "FED-25JAN" or "PRES-2024")
 */
export async function getMarketsBySlug(eventTicker: string): Promise<UnifiedMarket[]> {
    try {
        // Kalshi API expects uppercase tickers, but URLs use lowercase
        const normalizedTicker = eventTicker.toUpperCase();
        const url = `https://api.elections.kalshi.com/trade-api/v2/events/${normalizedTicker}`;
        const response = await axios.get(url, {
            params: { with_nested_markets: true }
        });

        const event = response.data.event;
        if (!event) return [];

        const unifiedMarkets: UnifiedMarket[] = [];
        const markets = event.markets || [];

        for (const market of markets) {
            const unifiedMarket = mapMarketToUnified(event, market);
            if (unifiedMarket) {
                unifiedMarkets.push(unifiedMarket);
            }
        }

        return unifiedMarkets;

    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            if (error.response.status === 404) {
                throw new Error(`Kalshi event not found: "${eventTicker}". Check that the event ticker is correct.`);
            }
            const apiError = error.response.data?.error || error.response.data?.message || "Unknown API Error";
            throw new Error(`Kalshi API Error (${error.response.status}): ${apiError}. Event Ticker: ${eventTicker}`);
        }
        console.error(`Unexpected error fetching Kalshi event ${eventTicker}:`, error);
        throw error;
    }
}
