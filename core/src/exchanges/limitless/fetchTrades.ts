import axios from 'axios';
import { HistoryFilterParams } from '../../BaseExchange';
import { Trade } from '../../types';
import { LIMITLESS_API_URL } from './utils';

/**
 * Fetch trade history for a specific market or user.
 * @param id - The market slug or wallet address
 */
export async function fetchTrades(id: string, params: HistoryFilterParams): Promise<Trade[]> {
    try {
        // No public /trades endpoint was discovered in the new API.
        // Portfolio trades are available at /portfolio/trades for the authenticated user.
        const url = `${LIMITLESS_API_URL}/portfolio/trades`;

        const response = await axios.get(url, {
            params: {
                limit: params.limit || 100
            }
        });

        const trades = response.data?.data || response.data || [];

        return trades.map((trade: any) => ({
            id: trade.id || String(trade.timestamp),
            timestamp: Number(trade.timestamp),
            price: parseFloat(trade.price),
            amount: parseFloat(trade.size || 0),
            side: trade.side?.toLowerCase() === 'buy' ? 'buy' : 'sell'
        }));

    } catch (error: any) {
        console.error(`Error fetching Limitless trades for ${id}:`, error.message);
        return [];
    }
}
