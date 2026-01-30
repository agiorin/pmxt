import axios from 'axios';
import { Position } from '../../types';
import { LIMITLESS_API_URL } from './utils';

export async function fetchPositions(userAddress: string): Promise<Position[]> {
    try {
        const url = `${LIMITLESS_API_URL}/portfolio/${userAddress}/positions`;
        const response = await axios.get(url);

        const data = response.data?.data || response.data || [];

        return data.map((p: any) => ({
            marketId: p.market?.slug || p.conditionId,
            outcomeId: p.asset,
            outcomeLabel: p.outcome || 'Unknown',
            size: parseFloat(p.size || '0'),
            entryPrice: parseFloat(p.avgPrice || '0'),
            currentPrice: parseFloat(p.curPrice || '0'),
            unrealizedPnL: parseFloat(p.cashPnl || '0'),
            realizedPnL: parseFloat(p.realizedPnl || '0')
        }));
    } catch (error: any) {
        // Limitless returns 404 if the user has no history on the platform.
        // We treat this as an empty portfolio rather than an error.
        if (error.response?.status === 404) {
            return [];
        }
        console.error(`Error fetching Limitless positions: ${error.message}`);
        return [];
    }
}
