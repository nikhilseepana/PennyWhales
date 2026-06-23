import {
  IndiaStockEntry,
  IndiaStocksPayload,
  ScanStock,
  UsDailyMiniEntry,
  Watchlist,
} from '../types/data';

const GITHUB_OWNER = 'nikhilseepana';
const GITHUB_REPO = 'PennyWhales';
const GITHUB_BRANCH = 'main';

// Mobile reads workflow-generated JSON straight from GitHub and never talks to the API.
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/api/data`;

export const MOBILE_DATA_SOURCE_LABEL = `${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}`;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${RAW_BASE}/${path}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getIndiaStocks(): Promise<{
  stocks: IndiaStockEntry[];
  updatedAt?: string;
}> {
  const data = await fetchJson<IndiaStocksPayload>('indiaStocks.json');

  if (Array.isArray(data.stocks)) {
    return { stocks: data.stocks, updatedAt: data.updatedAt };
  }

  const fallback = Array.isArray(data.symbols)
    ? data.symbols.map((symbol) => ({ symbol }))
    : [];

  return { stocks: fallback, updatedAt: data.updatedAt };
}

export async function getWatchlists(): Promise<Watchlist[]> {
  const data = await fetchJson<Watchlist[] | { watchlists: Watchlist[] }>(
    'watchlists.json'
  );

  if (Array.isArray(data)) {
    return data;
  }

  return data.watchlists ?? [];
}

export async function getUsDailyMiniHistory(
  limit = 20
): Promise<UsDailyMiniEntry[]> {
  const data = await fetchJson<UsDailyMiniEntry[] | { history: UsDailyMiniEntry[] }>(
    'usDailyMiniHistory.json'
  );

  const rows = Array.isArray(data) ? data : data.history ?? [];
  return rows.slice(0, limit);
}

// Cache so we only fetch once per session
let _scanCache: Map<string, ScanStock> | null = null;

export async function getScanStockMap(): Promise<Map<string, ScanStock>> {
  if (_scanCache) return _scanCache;
  const raw = await fetchJson<Record<string, unknown>>('scanResults.json');
  // The JSON has shape { fullScan: [...], miniScan: [...], ... }
  const arr: ScanStock[] = (
    (raw.fullScan as ScanStock[]) ??
    (raw.miniScan as ScanStock[]) ??
    (Array.isArray(raw) ? raw : [])
  );
  _scanCache = new Map(arr.map((s) => [s.ticker.toUpperCase(), s]));
  return _scanCache;
}
