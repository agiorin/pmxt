import axios from 'axios';
import { OHLCVParams, HistoryFilterParams } from '../../BaseExchange';
import { PriceCandle, CandleInterval } from '../../types';
import { CLOB_BASE_URL } from './utils';
import { probableErrorMapper } from './errors';

const INTERVAL_MAP: Record<CandleInterval, string> = {
    '1m': '1m',
    '5m': '1m',
    '15m': '1m',
    '1h': '1h',
    '6h': '6h',
    '1d': '1d',
};

function aggregateCandles(candles: PriceCandle[], intervalMs: number): PriceCandle[] {
    if (candles.length === 0) return [];
    const buckets = new Map<number, PriceCandle>();
    for (const c of candles) {
        const key = Math.floor(c.timestamp / intervalMs) * intervalMs;
        const existing = buckets.get(key);
        if (!existing) {
            buckets.set(key, { ...c, timestamp: key });
        } else {
            existing.high = Math.max(existing.high, c.high);
            existing.low = Math.min(existing.low, c.low);
            existing.close = c.close;
        }
    }
    return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchOHLCV(
    id: string,
    params: OHLCVParams | HistoryFilterParams,
): Promise<PriceCandle[]> {
    if (!params.resolution) {
        throw new Error('fetchOHLCV requires a resolution parameter.');
    }

    try {
        const apiInterval = INTERVAL_MAP[params.resolution] || '1h';

        const queryParams: Record<string, any> = {
            market: id,
            interval: apiInterval,
        };

        if (params.start) queryParams.startTs = Math.floor(params.start.getTime() / 1000);
        if (params.end) queryParams.endTs = Math.floor(params.end.getTime() / 1000);

        const response = await axios.get(`${CLOB_BASE_URL}/prices-history`, {
            params: queryParams,
        });

        const points: any[] = response.data?.history || response.data || [];

        let candles: PriceCandle[] = points
            .map((p: any) => {
                const price = Number(p.p);
                const ts = Number(p.t) * 1000;
                return {
                    timestamp: ts,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                    volume: 0,
                };
            })
            .sort((a: PriceCandle, b: PriceCandle) => a.timestamp - b.timestamp);

        // Client-side aggregation for intervals that don't have a direct API mapping
        if (params.resolution === '5m') {
            candles = aggregateCandles(candles, 5 * 60 * 1000);
        } else if (params.resolution === '15m') {
            candles = aggregateCandles(candles, 15 * 60 * 1000);
        }

        if (params.limit) {
            candles = candles.slice(-params.limit);
        }

        return candles;
    } catch (error: any) {
        throw probableErrorMapper.mapError(error);
    }
}
