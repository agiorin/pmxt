import axios from 'axios';
import { OrderBook } from '../../types';
import { LIMITLESS_API_URL } from './utils';

/**
 * Fetch the current order book for a specific market.
 * @param id - The market slug (preferred) or CLOB token ID
 */
export async function fetchOrderBook(id: string): Promise<OrderBook> {
    try {
        // New API uses slugs: /markets/{slug}/orderbook
        // If 'id' is a numeric token ID, this might fail unless we look up the slug.
        const url = `${LIMITLESS_API_URL}/markets/${id}/orderbook`;
        const response = await axios.get(url);

        const data = response.data;

        // Response format: { bids: [{price: 0.52, size: 100}], asks: [...] }
        const bids = (data.bids || []).map((level: any) => ({
            price: parseFloat(level.price),
            size: parseFloat(level.size)
        })).sort((a: any, b: any) => b.price - a.price);

        const asks = (data.asks || []).map((level: any) => ({
            price: parseFloat(level.price),
            size: parseFloat(level.size)
        })).sort((a: any, b: any) => a.price - b.price);

        return {
            bids,
            asks,
            timestamp: Date.now() // API doesn't seem to return a specific timestamp in the root anymore
        };

    } catch (error: any) {
        console.error(`Error fetching Limitless orderbook for ${id}:`, error.message);
        return { bids: [], asks: [] };
    }
}
