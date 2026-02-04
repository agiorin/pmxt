import axios from 'axios';
import { OrderBook } from '../../types';
import { LIMITLESS_API_URL } from './utils';
import { validateIdFormat } from '../../utils/validation';

// Limitless uses USDC with 6 decimals
const USDC_DECIMALS = 6;
const USDC_SCALE = Math.pow(10, USDC_DECIMALS);

/**
 * Convert raw orderbook size from smallest unit to human-readable USDC amount.
 */
function convertSize(rawSize: number): number {
    return rawSize / USDC_SCALE;
}

/**
 * Fetch the current order book for a specific market.
 * @param id - The market slug (preferred) or CLOB token ID
 */
export async function fetchOrderBook(id: string): Promise<OrderBook> {
    validateIdFormat(id, 'OrderBook');

    try {
        // New API uses slugs: /markets/{slug}/orderbook
        // If 'id' is a numeric token ID, this might fail unless we look up the slug.
        const url = `${LIMITLESS_API_URL}/markets/${id}/orderbook`;
        const response = await axios.get(url);

        const data = response.data;

        // Response format: { bids: [{price: 0.52, size: 100000000}], asks: [...] }
        // Sizes are in smallest unit (USDC with 6 decimals), convert to human-readable
        const bids = (data.bids || []).map((level: any) => ({
            price: parseFloat(level.price),
            size: convertSize(parseFloat(level.size))
        })).sort((a: any, b: any) => b.price - a.price);

        const asks = (data.asks || []).map((level: any) => ({
            price: parseFloat(level.price),
            size: convertSize(parseFloat(level.size))
        })).sort((a: any, b: any) => a.price - b.price);

        return {
            bids,
            asks,
            timestamp: Date.now() // API doesn't seem to return a specific timestamp in the root anymore
        };

    } catch (error: any) {
        return { bids: [], asks: [] };
    }
}
