import axios, { AxiosInstance } from 'axios';
import { OrderBook } from '../../types';
import { CLOB_BASE_URL } from './utils';
import { probableErrorMapper } from './errors';

export async function fetchOrderBook(id: string, http: AxiosInstance = axios): Promise<OrderBook> {
    try {
        const response = await http.get(`${CLOB_BASE_URL}/book`, {
            params: { token_id: id },
        });

        const data = response.data;

        const bids = (data.bids || [])
            .map((level: any) => ({
                price: parseFloat(level.price),
                size: parseFloat(level.size),
            }))
            .sort((a: any, b: any) => b.price - a.price);

        const asks = (data.asks || [])
            .map((level: any) => ({
                price: parseFloat(level.price),
                size: parseFloat(level.size),
            }))
            .sort((a: any, b: any) => a.price - b.price);

        return {
            bids,
            asks,
            timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
        };
    } catch (error: any) {
        throw probableErrorMapper.mapError(error);
    }
}
