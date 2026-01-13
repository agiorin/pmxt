import { PredictionMarketExchange, MarketFilterParams, HistoryFilterParams } from '../../BaseExchange';
import { UnifiedMarket, PriceCandle, OrderBook, Trade } from '../../types';
import { fetchMarkets } from './fetchMarkets';
import { searchMarkets } from './searchMarkets';
import { getMarketsBySlug } from './getMarketsBySlug';
import { fetchOHLCV } from './fetchOHLCV';
import { fetchOrderBook } from './fetchOrderBook';
import { fetchTrades } from './fetchTrades';

export class KalshiExchange extends PredictionMarketExchange {
    get name(): string {
        return "Kalshi";
    }

    async fetchMarkets(params?: MarketFilterParams): Promise<UnifiedMarket[]> {
        return fetchMarkets(params);
    }

    async searchMarkets(query: string, params?: MarketFilterParams): Promise<UnifiedMarket[]> {
        return searchMarkets(query, params);
    }

    async getMarketsBySlug(slug: string): Promise<UnifiedMarket[]> {
        return getMarketsBySlug(slug);
    }

    async fetchOHLCV(id: string, params: HistoryFilterParams): Promise<PriceCandle[]> {
        return fetchOHLCV(id, params);
    }

    async fetchOrderBook(id: string): Promise<OrderBook> {
        return fetchOrderBook(id);
    }

    async fetchTrades(id: string, params: HistoryFilterParams): Promise<Trade[]> {
        return fetchTrades(id, params);
    }
}
