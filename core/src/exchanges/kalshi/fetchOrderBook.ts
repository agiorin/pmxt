import axios from "axios";
import { OrderBook } from "../../types";
import { validateIdFormat } from "../../utils/validation";
import { kalshiErrorMapper } from "./errors";
import { getMarketsUrl } from "./config";

export async function fetchOrderBook(
  baseUrl: string,
  id: string,
): Promise<OrderBook> {
  validateIdFormat(id, "OrderBook");

  try {
    // Check if this is a NO outcome request
    const isNoOutcome = id.endsWith("-NO");
    const ticker = id.replace(/-NO$/, "");
    const url = getMarketsUrl(baseUrl, ticker, ["orderbook"]);
    const response = await axios.get(url);
    const data = response.data.orderbook_fp;

    // Structure: { yes_dollars: [["price", "qty"], ...], no_dollars: [["price", "qty"], ...] }
    // Prices are dollar strings (e.g. "0.15"), quantities are fixed-point strings (e.g. "100.00")
    // - yes_dollars: bids for buying YES at price X
    // - no_dollars: bids for buying NO at price X

    let bids: any[];
    let asks: any[];

    if (isNoOutcome) {
      // NO outcome order book:
      // - Bids: people buying NO (use data.no_dollars directly)
      // - Asks: people selling NO = people buying YES (invert data.yes_dollars)
      bids = (data.no_dollars || []).map((level: string[]) => ({
        price: parseFloat(level[0]),
        size: parseFloat(level[1]),
      }));

      asks = (data.yes_dollars || []).map((level: string[]) => ({
        price: Math.round((1 - parseFloat(level[0])) * 10000) / 10000,
        size: parseFloat(level[1]),
      }));
    } else {
      // YES outcome order book:
      // - Bids: people buying YES (use data.yes_dollars directly)
      // - Asks: people selling YES = people buying NO (invert data.no_dollars)
      bids = (data.yes_dollars || []).map((level: string[]) => ({
        price: parseFloat(level[0]),
        size: parseFloat(level[1]),
      }));

      asks = (data.no_dollars || []).map((level: string[]) => ({
        price: Math.round((1 - parseFloat(level[0])) * 10000) / 10000,
        size: parseFloat(level[1]),
      }));
    }

    // Sort bids desc, asks asc
    bids.sort((a: any, b: any) => b.price - a.price);
    asks.sort((a: any, b: any) => a.price - b.price);

    return { bids, asks, timestamp: Date.now() };
  } catch (error: any) {
    throw kalshiErrorMapper.mapError(error);
  }
}
