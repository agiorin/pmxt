/**
 * Kalshi API Configuration
 * Centralized endpoint management supporting both production and demo environments.
 */

// Production endpoints
export const KALSHI_PROD_API_URL = "https://api.elections.kalshi.com";
export const KALSHI_PROD_WS_URL =
  "wss://api.elections.kalshi.com/trade-api/ws/v2";

// Demo/Testing endpoints
export const KALSHI_DEMO_API_URL = "https://demo-api.elections.kalshi.com";
export const KALSHI_DEMO_WS_URL = "wss://demo-api.kalshi.co/trade-api/ws/v2";

// API path
export const KALSHI_PATHS = {
  TRADE_API: "/trade-api/v2",
  EVENTS: "/events",
  SERIES: "/series",
  PORTFOLIO: "/portfolio",
  MARKETS: "/markets",
  BALANCE: "/balance",
  ORDERS: "/orders",
  POSITIONS: "/positions",
};

/**
 * Kalshi API configuration
 */
export interface KalshiApiConfig {
  /** Base API URL (production or demo) */
  apiUrl: string;
  /** WebSocket URL (production or demo) */
  wsUrl?: string;
  /** Whether demo mode is enabled */
  demoMode: boolean;
}

export function getKalshiConfig(demoMode: boolean = false): KalshiApiConfig {
  return {
    apiUrl: demoMode ? KALSHI_DEMO_API_URL : KALSHI_PROD_API_URL,
    wsUrl: demoMode ? KALSHI_DEMO_WS_URL : KALSHI_PROD_WS_URL,
    demoMode,
  };
}

/**
 * Internal helper to build API URLs with proper path joining
 * Handles trailing slashes correctly and prevents double slashes
 */
function buildApiUrl(
  baseUrl: string,
  ...segments: (string | string[])[]
): string {
  const flatSegments = segments.flat().filter(Boolean); // Remove empty strings
  const path = flatSegments.map((s) => s.replace(/^\/+|\/+$/g, "")).join("/"); // Remove leading/trailing slashes and join
  return path ? `${baseUrl}/${path}` : baseUrl;
}

export function getEventsUrl(
  baseUrl: string,
  pathSegments: string[] = [],
): string {
  return buildApiUrl(
    baseUrl,
    KALSHI_PATHS.TRADE_API,
    KALSHI_PATHS.EVENTS,
    pathSegments,
  );
}

export function getSeriesUrl(
  baseUrl: string,
  seriesTicker?: string,
  pathSegments: string[] = [],
): string {
  const segments = [
    KALSHI_PATHS.TRADE_API,
    KALSHI_PATHS.SERIES,
    seriesTicker || "",
    ...pathSegments,
  ];
  return buildApiUrl(baseUrl, ...segments);
}

export function getPortfolioUrl(baseUrl: string, subPath?: string): string {
  return buildApiUrl(
    baseUrl,
    KALSHI_PATHS.TRADE_API,
    KALSHI_PATHS.PORTFOLIO,
    subPath || "",
  );
}

export function getMarketsUrl(
  baseUrl: string,
  marketId?: string,
  pathSegments: string[] = [],
): string {
  const segments = [
    KALSHI_PATHS.TRADE_API,
    KALSHI_PATHS.MARKETS,
    marketId || "",
    ...pathSegments,
  ];
  return buildApiUrl(baseUrl, ...segments);
}

/**
 * Get API path (without base URL) for signing authentication requests.
 */
export function getApiPath(...segments: string[]): string {
  const flatSegments = segments.filter(Boolean);
  const path = flatSegments.map((s) => s.replace(/^\/+|\/+$/g, "")).join("/");
  return `${KALSHI_PATHS.TRADE_API}/${path}`;
}
