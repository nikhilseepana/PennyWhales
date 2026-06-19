/**
 * Read-only API layer that fetches persisted JSON files directly from the GitHub repo.
 * Used automatically when the app is running on GitHub Pages (no backend available).
 *
 * Data is refreshed by the GitHub Actions workflows on their schedule and committed
 * back to the repo, so consumers always see the latest persisted snapshot.
 */
import axios from 'axios';
import { IndiaStocksResponse } from './api';
import { ScanResult } from './types';

const RAW_BASE =
  'https://raw.githubusercontent.com/nikhilseepana/PennyWhales/main/api/data';

async function fetchJson<T>(file: string): Promise<T> {
  const response = await axios.get<T>(`${RAW_BASE}/${file}`, {
    // bypass any cached stale version
    params: { _t: Date.now() },
  });
  return response.data;
}

// ── India Stocks ────────────────────────────────────────────────────────────

interface RawIndiaStocks {
  stocks?: Array<{ symbol: string; addedAt: string }>;
  symbols?: string[];
  updatedAt?: string;
}

export async function ghGetIndiaStocks(): Promise<IndiaStocksResponse> {
  const raw = await fetchJson<RawIndiaStocks>('indiaStocks.json');

  // Support both old (symbols[]) and new (stocks[]) format
  let stocksWithDates: Array<{ symbol: string; addedAt: string }> = [];
  let symbols: string[] = [];

  if (Array.isArray(raw.stocks)) {
    stocksWithDates = raw.stocks;
    symbols = raw.stocks.map((s) => s.symbol);
  } else if (Array.isArray(raw.symbols)) {
    symbols = raw.symbols;
    stocksWithDates = raw.symbols.map((s) => ({
      symbol: s,
      addedAt: raw.updatedAt || new Date().toISOString(),
    }));
  }

  return {
    success: true,
    symbols,
    stocksWithDates,
    count: symbols.length,
    sourceUrl: '',
    scrapedAt: raw.updatedAt || new Date().toISOString(),
    scrapeMode: 'github-pages-readonly',
    additions: [],
    additionsCount: 0,
  };
}

// ── Scan Results ─────────────────────────────────────────────────────────────

export async function ghGetLatestResults(): Promise<ScanResult | null> {
  try {
    const raw = await fetchJson<any>('scanResults.json');
    return raw as ScanResult;
  } catch {
    return null;
  }
}

// ── US Daily Mini History ────────────────────────────────────────────────────

export async function ghGetUSDailyMiniHistory(limit = 60) {
  const raw = await fetchJson<any>('usDailyMiniHistory.json');
  const history = Array.isArray(raw) ? raw : (raw.history ?? []);
  return {
    success: true,
    count: Math.min(history.length, limit),
    history: history.slice(0, limit),
  };
}

// ── Watchlists ───────────────────────────────────────────────────────────────

export async function ghGetWatchlists() {
  const raw = await fetchJson<any>('watchlists.json');
  const list = Array.isArray(raw) ? raw : (raw.watchlists ?? []);
  return { watchlists: list, count: list.length };
}

// ── Holdings ─────────────────────────────────────────────────────────────────

export async function ghGetHoldings() {
  const raw = await fetchJson<any>('holdings.json');
  const holdings = Array.isArray(raw) ? raw : (raw.holdings ?? []);
  return { holdings, count: holdings.length };
}

// ── Institutional Changes ────────────────────────────────────────────────────

export async function ghGetInstitutionalChanges() {
  const raw = await fetchJson<any>('institutionalChanges.json');
  return raw;
}
