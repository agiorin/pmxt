export * from './BaseExchange';
export * from './types';
export * from './exchanges/polymarket';
export * from './exchanges/kalshi';

import { PolymarketExchange } from './exchanges/polymarket';
import { KalshiExchange } from './exchanges/kalshi';

const pmxt = {
    polymarket: PolymarketExchange,
    kalshi: KalshiExchange,
    Polymarket: PolymarketExchange,
    Kalshi: KalshiExchange
};

export default pmxt;
