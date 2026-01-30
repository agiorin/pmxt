export * from './BaseExchange';
export * from './types';
export * from './utils/math';
export * from './exchanges/polymarket';
export * from './exchanges/limitless';
export * from './exchanges/kalshi';
export * from './server/app';
export * from './server/utils/port-manager';
export * from './server/utils/lock-file';

import { PolymarketExchange } from './exchanges/polymarket';
import { LimitlessExchange } from './exchanges/limitless';
import { KalshiExchange } from './exchanges/kalshi';

const pmxt = {
    polymarket: PolymarketExchange,
    limitless: LimitlessExchange,
    kalshi: KalshiExchange,
    Polymarket: PolymarketExchange,
    Limitless: LimitlessExchange,
    Kalshi: KalshiExchange
};

export const polymarket = PolymarketExchange;
export const limitless = LimitlessExchange;
export const kalshi = KalshiExchange;

export default pmxt;
