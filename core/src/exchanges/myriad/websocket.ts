import { OrderBook, Trade } from '../../types';
import { fetchOrderBook } from './fetchOrderBook';
import { fetchTrades } from './fetchTrades';

// Myriad API v2 does not expose a WebSocket endpoint.
// We implement a poll-based fallback that resolves promises
// on each polling interval, matching the CCXT Pro async pattern.

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds

export class MyriadWebSocket {
    private headers: Record<string, string>;
    private callApi: (operationId: string, params?: Record<string, any>) => Promise<any>;
    private pollInterval: number;
    private orderBookTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
    private tradeTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
    private orderBookResolvers: Map<string, ((value: OrderBook) => void)[]> = new Map();
    private tradeResolvers: Map<string, ((value: Trade[]) => void)[]> = new Map();
    private lastTradeTimestamp: Map<string, number> = new Map();
    private closed = false;

    constructor(headers: Record<string, string>, callApi: (operationId: string, params?: Record<string, any>) => Promise<any>, pollInterval?: number) {
        this.headers = headers;
        this.callApi = callApi;
        this.pollInterval = pollInterval || DEFAULT_POLL_INTERVAL;
    }

    async watchOrderBook(id: string): Promise<OrderBook> {
        if (this.closed) throw new Error('WebSocket connection is closed');

        return new Promise<OrderBook>((resolve) => {
            if (!this.orderBookResolvers.has(id)) {
                this.orderBookResolvers.set(id, []);
            }
            this.orderBookResolvers.get(id)!.push(resolve);

            if (!this.orderBookTimers.has(id)) {
                this.startOrderBookPolling(id);
            }
        });
    }

    async watchTrades(id: string): Promise<Trade[]> {
        if (this.closed) throw new Error('WebSocket connection is closed');

        return new Promise<Trade[]>((resolve) => {
            if (!this.tradeResolvers.has(id)) {
                this.tradeResolvers.set(id, []);
            }
            this.tradeResolvers.get(id)!.push(resolve);

            if (!this.tradeTimers.has(id)) {
                this.startTradePolling(id);
            }
        });
    }

    async close(): Promise<void> {
        this.closed = true;

        for (const timer of this.orderBookTimers.values()) {
            clearInterval(timer);
        }
        for (const timer of this.tradeTimers.values()) {
            clearInterval(timer);
        }

        this.orderBookTimers.clear();
        this.tradeTimers.clear();
        this.orderBookResolvers.clear();
        this.tradeResolvers.clear();
    }

    private startOrderBookPolling(id: string): void {
        const poll = async () => {
            try {
                const book = await fetchOrderBook(id, this.callApi);
                const resolvers = this.orderBookResolvers.get(id) || [];
                this.orderBookResolvers.set(id, []);
                for (const resolve of resolvers) {
                    resolve(book);
                }
            } catch {
                // Silently retry on next interval
            }
        };

        // Immediate first poll
        poll();

        const timer = setInterval(poll, this.pollInterval);
        this.orderBookTimers.set(id, timer);
    }

    private startTradePolling(id: string): void {
        const poll = async () => {
            try {
                const since = this.lastTradeTimestamp.get(id);
                const trades = await fetchTrades(
                    id,
                    { limit: 50, start: since ? new Date(since) : undefined },
                    this.headers,
                );

                if (trades.length > 0) {
                    const maxTs = Math.max(...trades.map(t => t.timestamp));
                    this.lastTradeTimestamp.set(id, maxTs + 1);
                }

                const resolvers = this.tradeResolvers.get(id) || [];
                this.tradeResolvers.set(id, []);
                for (const resolve of resolvers) {
                    resolve(trades);
                }
            } catch {
                // Silently retry on next interval
            }
        };

        poll();

        const timer = setInterval(poll, this.pollInterval);
        this.tradeTimers.set(id, timer);
    }
}
