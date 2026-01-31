import axios from 'axios';
import { Position } from '../../types';
import { DATA_API_URL } from './utils';

interface PolymarketPosition {
    asset: string;
    conditionId: string;
    size: string;
    avgPrice: string;
    currentValue: string;
    cashPnl: string;
    percentPnl: string;
    title: string;
    outcomeIndex: string;
    outcome: string;
    eventSlug: string;
    curPrice?: string;
    realizedPnl?: string;
}

export async function fetchPositions(userAddress: string): Promise<Position[]> {
    try {
        const response = await axios.get(`${DATA_API_URL}/positions`, {
            params: {
                user: userAddress,
                limit: 100
            }
        });

        const data = Array.isArray(response.data) ? response.data : [];

        return data.map((p: PolymarketPosition) => ({
            marketId: p.conditionId,
            outcomeId: p.asset,
            outcomeLabel: p.outcome || 'Unknown',
            size: parseFloat(p.size),
            entryPrice: parseFloat(p.avgPrice),
            currentPrice: parseFloat(p.curPrice || '0'),
            unrealizedPnL: parseFloat(p.cashPnl || '0'),
            realizedPnL: parseFloat(p.realizedPnl || '0')
        }));
    } catch (error: any) {
        const apiError = error.response?.data?.error || error.response?.data?.message || error.message;
        console.error(`[Polymarket] fetchPositions failed for ${userAddress}: ${apiError}`);
        throw new Error(`Polymarket Positions API Error: ${apiError}`);
    }
}
