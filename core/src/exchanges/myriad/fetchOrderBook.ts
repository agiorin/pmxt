import axios from 'axios';
import { OrderBook } from '../../types';
import { BASE_URL } from './utils';
import { myriadErrorMapper } from './errors';

// Myriad is AMM-based -- there is no native order book.
// We synthesize a minimal order book from the current outcome price
// and quote data to give callers a consistent interface.

export async function fetchOrderBook(
    id: string,
    headers?: Record<string, string>
): Promise<OrderBook> {
    try {
        // id format: {networkId}:{marketId}:{outcomeId}
        const parts = id.split(':');
        if (parts.length < 3) {
            throw new Error(`Invalid Myriad outcome ID format: "${id}". Expected "{networkId}:{marketId}:{outcomeId}".`);
        }

        const [networkId, marketId, outcomeId] = parts;

        // Fetch the market to get current prices
        const response = await axios.get(`${BASE_URL}/markets/${marketId}`, {
            params: { network_id: Number(networkId) },
            headers,
        });

        const market = response.data.data || response.data;
        const outcomes = market.outcomes || [];
        const outcome = outcomes.find((o: any) => String(o.id) === outcomeId) || outcomes[0];

        if (!outcome) {
            return { bids: [], asks: [], timestamp: Date.now() };
        }

        const price = Number(outcome.price) || 0.5;
        const liquidity = Number(market.liquidity || 0);

        // For AMM markets, we represent the current price as a single-level book.
        // The spread is zero (AMM provides continuous liquidity at the current price).
        // Size is derived from the market's liquidity.
        const size = liquidity > 0 ? liquidity : 1;

        return {
            bids: [{ price, size }],
            asks: [{ price, size }],
            timestamp: Date.now(),
        };
    } catch (error: any) {
        throw myriadErrorMapper.mapError(error);
    }
}
