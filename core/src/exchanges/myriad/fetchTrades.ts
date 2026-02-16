import axios from 'axios';
import { TradesParams, HistoryFilterParams } from '../../BaseExchange';
import { Trade } from '../../types';
import { BASE_URL } from './utils';
import { myriadErrorMapper } from './errors';

export async function fetchTrades(
    id: string,
    params: TradesParams | HistoryFilterParams,
    headers?: Record<string, string>
): Promise<Trade[]> {
    try {
        // id format: {networkId}:{marketId}:{outcomeId} or {networkId}:{marketId}
        const parts = id.split(':');
        if (parts.length < 2) {
            throw new Error(`Invalid Myriad ID format: "${id}". Expected "{networkId}:{marketId}" or "{networkId}:{marketId}:{outcomeId}".`);
        }

        const [networkId, marketId] = parts;
        const outcomeId = parts.length >= 3 ? parts[2] : undefined;

        const queryParams: any = {
            network_id: Number(networkId),
            page: 1,
            limit: params.limit || 100,
        };

        // Handle date range filters
        const ensureDate = (d: any): Date => {
            if (typeof d === 'string') {
                if (!d.endsWith('Z') && !d.match(/[+-]\d{2}:\d{2}$/)) {
                    return new Date(d + 'Z');
                }
                return new Date(d);
            }
            return d;
        };

        if (params.start) {
            queryParams.since = Math.floor(ensureDate(params.start).getTime() / 1000);
        }
        if (params.end) {
            queryParams.until = Math.floor(ensureDate(params.end).getTime() / 1000);
        }

        const response = await axios.get(`${BASE_URL}/markets/${marketId}/events`, {
            params: queryParams,
            headers,
        });

        const events = response.data.data || response.data.events || [];

        // Filter to buy/sell actions only (skip liquidity events)
        const tradeEvents = events.filter((e: any) =>
            e.action === 'buy' || e.action === 'sell'
        );

        // Filter by outcomeId if specified
        const filtered = outcomeId
            ? tradeEvents.filter((e: any) => String(e.outcomeId) === outcomeId)
            : tradeEvents;

        return filtered.map((t: any, index: number) => ({
            id: `${t.blockNumber || t.timestamp}-${index}`,
            timestamp: (t.timestamp || 0) * 1000,
            price: t.shares > 0 ? Number(t.value) / Number(t.shares) : 0,
            amount: Number(t.shares || 0),
            side: t.action === 'buy' ? 'buy' as const : 'sell' as const,
        }));
    } catch (error: any) {
        throw myriadErrorMapper.mapError(error);
    }
}
