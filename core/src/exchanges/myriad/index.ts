import axios from 'axios';
import { PredictionMarketExchange, MarketFilterParams, HistoryFilterParams, OHLCVParams, TradesParams, ExchangeCredentials, EventFetchParams } from '../../BaseExchange';
import { UnifiedMarket, UnifiedEvent, PriceCandle, OrderBook, Trade, Balance, Order, Position, CreateOrderParams } from '../../types';
import { fetchMarkets } from './fetchMarkets';
import { fetchEvents } from './fetchEvents';
import { fetchOHLCV } from './fetchOHLCV';
import { fetchOrderBook } from './fetchOrderBook';
import { fetchTrades } from './fetchTrades';
import { MyriadAuth } from './auth';
import { MyriadWebSocket } from './websocket';
import { myriadErrorMapper } from './errors';
import { AuthenticationError } from '../../errors';
import { BASE_URL } from './utils';

export class MyriadExchange extends PredictionMarketExchange {
    private auth?: MyriadAuth;
    private ws?: MyriadWebSocket;

    constructor(credentials?: ExchangeCredentials) {
        super(credentials);
        if (credentials?.apiKey) {
            this.auth = new MyriadAuth(credentials);
        }
    }

    get name(): string {
        return 'Myriad';
    }

    private getHeaders(): Record<string, string> {
        if (this.auth) {
            return this.auth.getHeaders();
        }
        return { 'Content-Type': 'application/json' };
    }

    private ensureAuth(): MyriadAuth {
        if (!this.auth) {
            throw new AuthenticationError(
                'This operation requires authentication. Initialize MyriadExchange with credentials (apiKey).',
                'Myriad'
            );
        }
        return this.auth;
    }

    // ------------------------------------------------------------------------
    // Market Data
    // ------------------------------------------------------------------------

    protected async fetchMarketsImpl(params?: MarketFilterParams): Promise<UnifiedMarket[]> {
        return fetchMarkets(params, this.getHeaders());
    }

    protected async fetchEventsImpl(params: EventFetchParams): Promise<UnifiedEvent[]> {
        return fetchEvents(params, this.getHeaders());
    }

    async fetchOHLCV(id: string, params: OHLCVParams | HistoryFilterParams): Promise<PriceCandle[]> {
        return fetchOHLCV(id, params, this.getHeaders());
    }

    async fetchOrderBook(id: string): Promise<OrderBook> {
        return fetchOrderBook(id, this.getHeaders());
    }

    async fetchTrades(id: string, params: TradesParams | HistoryFilterParams): Promise<Trade[]> {
        if ('resolution' in params && params.resolution !== undefined) {
            console.warn(
                '[pmxt] Warning: The "resolution" parameter is deprecated for fetchTrades() and will be ignored. ' +
                'It will be removed in v3.0.0. Please remove it from your code.'
            );
        }
        return fetchTrades(id, params, this.getHeaders());
    }

    // ------------------------------------------------------------------------
    // Trading
    // ------------------------------------------------------------------------

    async createOrder(params: CreateOrderParams): Promise<Order> {
        try {
            const auth = this.ensureAuth();
            const headers = auth.getHeaders();

            // Parse composite marketId: {networkId}:{marketId}
            const parts = params.marketId.split(':');
            if (parts.length < 2) {
                throw new Error(`Invalid marketId format: "${params.marketId}". Expected "{networkId}:{marketId}".`);
            }
            const [networkId, marketId] = parts;

            // Parse outcomeId: {networkId}:{marketId}:{outcomeId}
            const outcomeParts = params.outcomeId.split(':');
            const outcomeId = outcomeParts.length >= 3 ? Number(outcomeParts[2]) : Number(outcomeParts[0]);

            const quoteBody: any = {
                market_id: Number(marketId),
                outcome_id: outcomeId,
                network_id: Number(networkId),
                action: params.side,
            };

            if (params.side === 'buy') {
                quoteBody.value = params.amount;
            } else {
                quoteBody.shares = params.amount;
            }

            if (params.price) {
                // Use price as slippage tolerance for AMM
                quoteBody.slippage = 0.01;
            }

            const response = await axios.post(`${BASE_URL}/markets/quote`, quoteBody, { headers });
            const quote = response.data;

            return {
                id: `myriad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                marketId: params.marketId,
                outcomeId: params.outcomeId,
                side: params.side,
                type: 'market', // AMM only supports market orders
                price: quote.price_average,
                amount: params.side === 'buy' ? quote.value : quote.shares,
                status: 'pending',
                filled: 0,
                remaining: params.side === 'buy' ? quote.value : quote.shares,
                timestamp: Date.now(),
                fee: quote.fees ? (quote.fees.fee + quote.fees.treasury + quote.fees.distributor) : undefined,
            };
        } catch (error: any) {
            throw myriadErrorMapper.mapError(error);
        }
    }

    async cancelOrder(_orderId: string): Promise<Order> {
        throw new Error('cancelOrder() is not supported by Myriad (AMM-based exchange, no open orders)');
    }

    async fetchOrder(_orderId: string): Promise<Order> {
        throw new Error('fetchOrder() is not supported by Myriad (AMM-based exchange)');
    }

    async fetchOpenOrders(_marketId?: string): Promise<Order[]> {
        return []; // AMM: no open orders
    }

    async fetchPositions(): Promise<Position[]> {
        try {
            const auth = this.ensureAuth();
            const headers = auth.getHeaders();
            const walletAddress = auth.walletAddress;

            if (!walletAddress) {
                throw new AuthenticationError(
                    'fetchPositions requires a wallet address. Pass privateKey as the wallet address in credentials.',
                    'Myriad'
                );
            }

            const response = await axios.get(`${BASE_URL}/users/${walletAddress}/portfolio`, {
                params: { limit: 100 },
                headers,
            });

            const items = response.data.data || response.data.items || [];

            return items.map((pos: any) => ({
                marketId: `${pos.networkId}:${pos.marketId}`,
                outcomeId: `${pos.networkId}:${pos.marketId}:${pos.outcomeId}`,
                outcomeLabel: pos.outcomeTitle || `Outcome ${pos.outcomeId}`,
                size: Number(pos.shares || 0),
                entryPrice: Number(pos.price || 0),
                currentPrice: Number(pos.value || 0) / Math.max(Number(pos.shares || 1), 1),
                unrealizedPnL: Number(pos.profit || 0),
            }));
        } catch (error: any) {
            throw myriadErrorMapper.mapError(error);
        }
    }

    async fetchBalance(): Promise<Balance[]> {
        // Myriad is on-chain; balances are per-chain token balances.
        // The API doesn't expose a balance endpoint directly.
        // We approximate from portfolio positions.
        try {
            const auth = this.ensureAuth();
            const headers = auth.getHeaders();
            const walletAddress = auth.walletAddress;

            if (!walletAddress) {
                throw new AuthenticationError(
                    'fetchBalance requires a wallet address. Pass privateKey as the wallet address in credentials.',
                    'Myriad'
                );
            }

            const response = await axios.get(`${BASE_URL}/users/${walletAddress}/portfolio`, {
                params: { limit: 100 },
                headers,
            });

            const items = response.data.data || response.data.items || [];
            let totalValue = 0;
            for (const pos of items) {
                totalValue += Number(pos.value || 0);
            }

            return [{
                currency: 'USDC',
                total: totalValue,
                available: 0, // Cannot determine on-chain balance via API
                locked: totalValue,
            }];
        } catch (error: any) {
            throw myriadErrorMapper.mapError(error);
        }
    }

    // ------------------------------------------------------------------------
    // WebSocket (poll-based)
    // ------------------------------------------------------------------------

    async watchOrderBook(id: string, _limit?: number): Promise<OrderBook> {
        this.ensureAuth();
        if (!this.ws) {
            this.ws = new MyriadWebSocket(this.getHeaders());
        }
        return this.ws.watchOrderBook(id);
    }

    async watchTrades(id: string, _since?: number, _limit?: number): Promise<Trade[]> {
        this.ensureAuth();
        if (!this.ws) {
            this.ws = new MyriadWebSocket(this.getHeaders());
        }
        return this.ws.watchTrades(id);
    }

    async close(): Promise<void> {
        if (this.ws) {
            await this.ws.close();
            this.ws = undefined;
        }
    }
}
