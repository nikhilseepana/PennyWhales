export interface IndiaStockEntry {
  symbol: string;
  addedAt?: string;
}

export interface IndiaStocksPayload {
  symbols?: string[];
  stocks?: IndiaStockEntry[];
  updatedAt?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  stocks: string[];
  created?: string;
  updated?: string;
}

export interface UsDailyMiniEntry {
  id?: string;
  timestamp?: string;
  scanDate?: string;
  tickers?: string[];
  totalMatched?: number;
}

export interface ScanStockPerformance {
  day?: number | null;
  week?: number | null;
  month?: number | null;
  quarter?: number | null;
  halfYear?: number | null;
  ytd?: number | null;
  year?: number | null;
}

export interface ScanStock {
  ticker: string;
  price?: number | null;
  previous_close?: number | null;
  blackrock_pct?: number | null;
  vanguard_pct?: number | null;
  statestreet_pct?: number | null;
  blackrock_market_value?: number | null;
  vanguard_market_value?: number | null;
  statestreet_market_value?: number | null;
  blackrock_change?: number | null;
  vanguard_change?: number | null;
  statestreet_change?: number | null;
  market_cap?: number | null;
  avg_volume?: number | null;
  employee_count?: number | null;
  ipo_date?: string | null;
  sector?: string | null;
  industry?: string | null;
  company_name?: string | null;
  description?: string | null;
  inst_own?: number | null;
  inst_trans?: number | null;
  sma200?: number | null;
  fire_level?: number;
  recommendation?: string | null;
  performance?: ScanStockPerformance | null;
}
