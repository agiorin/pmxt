import { RequestOptions } from "../../BaseExchange";

export function resolveMyriadPrice(event: any, options?: RequestOptions): number {
  if (
    options?.mode === "raw" &&
    event.price !== undefined &&
    event.price !== null
  ) {
    return Number(event.price);
  }

  const shares = Math.max(Number(event.shares || 1), 1);
  return Number(event.value || 0) / shares;
}

