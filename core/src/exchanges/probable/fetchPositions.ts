import axios from 'axios';
import { Position } from '../../types';
import { probableErrorMapper } from './errors';

const POSITIONS_URL = 'https://api.probable.markets/public/api/v1/position/current';

export async function fetchPositions(userAddress: string): Promise<Position[]> {
    try {
        const response = await axios.get(POSITIONS_URL, {
            params: {
                user: userAddress,
                limit: 500,
            },
        });

        const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

        return data.map((p: any) => ({
            marketId: String(p.conditionId || p.condition_id || ''),
            outcomeId: String(p.asset || p.token_id || ''),
            outcomeLabel: p.outcome || p.title || 'Unknown',
            size: parseFloat(p.size || '0'),
            entryPrice: parseFloat(p.avgPrice || p.avg_price || '0'),
            currentPrice: parseFloat(p.curPrice || p.cur_price || '0'),
            unrealizedPnL: parseFloat(p.cashPnl || p.cash_pnl || '0'),
            realizedPnL: parseFloat(p.realizedPnl || p.realized_pnl || '0'),
        }));
    } catch (error: any) {
        throw probableErrorMapper.mapError(error);
    }
}
