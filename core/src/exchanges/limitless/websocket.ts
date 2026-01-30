import { OrderBook, Trade } from '../../types';

export interface LimitlessWebSocketConfig {
    reconnectIntervalMs?: number;
    flushIntervalMs?: number;
}

/**
 * Limitless WebSocket implementation.
 * 
 * NOTE: As of Limitless API v1, there is no public WebSocket endpoint for 
 * orderbook or trade updates. These methods are currently disabled.
 */
export class LimitlessWebSocket {
    constructor(_config: LimitlessWebSocketConfig = {}) { }

    async watchOrderBook(_id: string): Promise<OrderBook> {
        throw new Error('Limitless WebSocket (watchOrderBook) is currently unavailable. The Limitless API v1 does not provide a public WebSocket endpoint for real-time updates. Please use fetchOrderBook() for polling instead.');
    }

    async watchTrades(_id: string): Promise<Trade[]> {
        throw new Error('Limitless WebSocket (watchTrades) is currently unavailable. The Limitless API v1 does not provide a public WebSocket endpoint for real-time updates. Please use fetchOHLCV() or fetchOrderBook() for recent activity instead.');
    }

    async close(): Promise<void> {
        // No-op as no connection is established
    }
}

