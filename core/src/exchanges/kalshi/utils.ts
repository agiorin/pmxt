import { RequestOptions } from "../../BaseExchange";
import { UnifiedMarket, MarketOutcome, CandleInterval } from "../../types";
import { addBinaryOutcomes } from "../../utils/market-utils";
import {
  getKalshiPriceContext,
  fromKalshiCents,
  invertKalshiUnified,
} from "./price";

export function mapMarketToUnified(
  event: any,
  market: any,
  options?: RequestOptions,
): UnifiedMarket | null {
  if (!market) return null;

  const priceContext = getKalshiPriceContext(options);

  // Calculate price
  let price = priceContext.defaultPrice;
  if (market.last_price) {
    price = fromKalshiCents(market.last_price, priceContext);
  } else if (market.yes_ask && market.yes_bid) {
    price =
      (fromKalshiCents(market.yes_ask, priceContext) +
        fromKalshiCents(market.yes_bid, priceContext)) /
      2;
  } else if (market.yes_ask) {
    price = fromKalshiCents(market.yes_ask, priceContext);
  }

  // Extract candidate name
  let candidateName: string | null = null;
  if (market.subtitle || market.yes_sub_title) {
    candidateName = market.subtitle || market.yes_sub_title;
  }

  // Calculate 24h change
  let priceChange = 0;
  if (priceContext.isRaw) {
    if (
      market.previous_price !== undefined &&
      market.last_price !== undefined
    ) {
      priceChange = market.last_price - market.previous_price;
    } else if (
      market.previous_price_dollars !== undefined &&
      market.last_price_dollars !== undefined
    ) {
      priceChange = market.last_price_dollars - market.previous_price_dollars;
    }
  } else if (
    market.previous_price_dollars !== undefined &&
    market.last_price_dollars !== undefined
  ) {
    priceChange = market.last_price_dollars - market.previous_price_dollars;
  }

  const outcomes: MarketOutcome[] = [
    {
      outcomeId: market.ticker,
      marketId: market.ticker,
      label: candidateName || "Yes",
      price: price,
      priceChange24h: priceChange,
    },
    {
      outcomeId: `${market.ticker}-NO`,
      marketId: market.ticker,
      label: candidateName ? `Not ${candidateName}` : "No",
      price: invertKalshiUnified(price, priceContext),
      priceChange24h: -priceChange, // Inverse change for No? simplified assumption
    },
  ];

  // Combine category and tags into a unified tags array
  const unifiedTags: string[] = [];

  // Add category first (if it exists)
  if (event.category) {
    unifiedTags.push(event.category);
  }

  // Add tags (if they exist and avoid duplicates)
  if (event.tags && Array.isArray(event.tags)) {
    for (const tag of event.tags) {
      if (!unifiedTags.includes(tag)) {
        unifiedTags.push(tag);
      }
    }
  }

  const um = {
    id: market.ticker,
    marketId: market.ticker,
    eventId: event.event_ticker,
    title: event.title,
    description: market.rules_primary || market.rules_secondary || "",
    outcomes: outcomes,
    resolutionDate: new Date(market.expiration_time),
    volume24h: Number(market.volume_24h || market.volume || 0),
    volume: Number(market.volume || 0),
    liquidity: Number(market.liquidity || 0), // Kalshi 'liquidity' might need specific mapping if available, otherwise 0 to avoid conflation
    openInterest: Number(market.open_interest || 0),
    url: `https://kalshi.com/events/${event.event_ticker}`,
    category: event.category,
    tags: unifiedTags,
  } as UnifiedMarket;

  addBinaryOutcomes(um);
  return um;
}

export function mapIntervalToKalshi(interval: CandleInterval): number {
  const mapping: Record<CandleInterval, number> = {
    "1m": 1,
    "5m": 1,
    "15m": 1,
    "1h": 60,
    "6h": 60,
    "1d": 1440,
  };
  return mapping[interval];
}
