import { RequestOptions } from "../../BaseExchange";

export interface KalshiPriceContext {
  isRaw: boolean;
  scale: number;
  unit: number;
  defaultPrice: number;
}

export function getKalshiPriceContext(
  options?: RequestOptions,
): KalshiPriceContext {
  const isRaw = options?.mode === "raw";
  return {
    isRaw,
    scale: isRaw ? 1 : 100,
    unit: isRaw ? 100 : 1,
    defaultPrice: isRaw ? 50 : 0.5,
  };
}

export function fromKalshiCents(
  priceInCents: number,
  context: KalshiPriceContext,
): number {
  return priceInCents / context.scale;
}

export function invertKalshiCents(
  priceInCents: number,
  context: KalshiPriceContext,
): number {
  return context.unit - fromKalshiCents(priceInCents, context);
}

export function invertKalshiUnified(
  price: number,
  context: KalshiPriceContext,
): number {
  return context.unit - price;
}
