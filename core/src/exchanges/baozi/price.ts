import { RequestOptions } from "../../BaseExchange";
import { MarketOutcome } from "../../types";

export function clampBaoziPrice(
  value: number,
  options?: RequestOptions,
): number {
  if (options?.mode === "raw") {
    return value;
  }
  return Math.min(Math.max(value, 0), 1);
}

export function normalizeBaoziOutcomes(
  outcomes: MarketOutcome[],
  options?: RequestOptions,
): void {
  if (options?.mode === "raw") {
    return;
  }

  const sum = outcomes.reduce((acc, item) => acc + item.price, 0);
  if (sum <= 0) {
    return;
  }

  for (const outcome of outcomes) {
    outcome.price = outcome.price / sum;
  }
}
