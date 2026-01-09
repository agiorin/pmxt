export * from './BaseExchange';
export * from './types';
export * from './exchanges/Polymarket';
export * from './exchanges/Kalshi';

import { PolymarketExchange } from './exchanges/Polymarket';
import { KalshiExchange } from './exchanges/Kalshi';

const pmxt = {
    polymarket: PolymarketExchange,
    kalshi: KalshiExchange,
    Polymarket: PolymarketExchange,
    Kalshi: KalshiExchange
};

export default pmxt;

