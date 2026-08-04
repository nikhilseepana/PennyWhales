import React, { useEffect, useMemo, useState } from 'react';
import api from './api';
import { theme } from './theme';
import ChartView from './components/ChartView';
import { Stock } from './types';

const CHARTINK_SCAN_LINK = 'scanlink:8816f4f438ed5b5c82a674abfdc4d930';

const buildChartinkStockUrl = (ticker: string): string =>
  `https://chartink.com/stocks-new?from_scan=1&scan_link=${encodeURIComponent(CHARTINK_SCAN_LINK)}&symbol=${encodeURIComponent(ticker)}&timeframe=Daily`;

const makeStockData = (symbols: string[]): Map<string, Stock> => {
  const map = new Map<string, Stock>();
  symbols.forEach(sym => {
    map.set(sym, {
      ticker: sym,
      price: 0,
      blackrock_pct: 0,
      vanguard_pct: 0,
      blackrock_source: '',
      vanguard_source: '',
      data_quality: '',
      sources_count: 0,
      discrepancy: false,
      notes: '',
    } as any);
  });
  return map;
};

const IndianStocks: React.FC = () => {
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [todaySymbols, setTodaySymbols] = useState<Set<string>>(new Set());
  const [scrapedAt, setScrapedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      const result = await api.getIndiaStocks(false);
      setTodaySymbols(new Set(result.additions || []));
      setAllSymbols(result.symbols || []);
      setScrapedAt(result.scrapedAt || null);
    } catch (err) {
      setError('Failed to load India stocks');
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await api.startIndiaScan(true);
      const before = scrapedAt;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const result = await api.getIndiaStocks(false);
        if (result.scrapedAt && result.scrapedAt !== before) {
          setTodaySymbols(new Set(result.additions || []));
          setAllSymbols(result.symbols || []);
          setScrapedAt(result.scrapedAt);
          break;
        }
      }
    } catch (err) {
      setError('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Sort: today's new stocks first, then alphabetically
  const sortedSymbols = useMemo(() => {
    const q = query.trim().toUpperCase();
    const filtered = q ? allSymbols.filter(s => s.includes(q)) : allSymbols;
    return [...filtered].sort((a, b) => {
      const aNew = todaySymbols.has(a) ? 0 : 1;
      const bNew = todaySymbols.has(b) ? 0 : 1;
      return aNew - bNew || a.localeCompare(b);
    });
  }, [allSymbols, todaySymbols, query]);

  const stockData = useMemo(() => makeStockData(sortedSymbols), [sortedSymbols]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: theme.typography.fontFamily }}>

      <div style={{ padding: theme.spacing.lg, borderBottom: `1px solid ${theme.ui.border}`, backgroundColor: theme.ui.surface, flexShrink: 0, display: 'flex', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: theme.typography.fontSize.xxl, fontWeight: theme.typography.fontWeight.bold, color: theme.ui.text.primary }}>
            🇮🇳 India Scan
          </h1>
          {scrapedAt && (
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.ui.text.secondary, fontSize: theme.typography.fontSize.sm }}>
              Last scan: {new Date(scrapedAt).toLocaleString()} · {todaySymbols.size} new today · {allSymbols.length} total
            </p>
          )}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter symbol…"
          style={{ border: `1px solid ${theme.ui.border}`, borderRadius: theme.borderRadius.lg, padding: `${theme.spacing.sm} ${theme.spacing.md}`, fontSize: theme.typography.fontSize.sm, backgroundColor: theme.ui.surface, color: theme.ui.text.primary, width: 180 }}
        />
        <button
          onClick={runScan}
          disabled={scanning}
          style={{ border: 'none', backgroundColor: scanning ? '#ccc' : theme.status.info, color: 'white', borderRadius: theme.borderRadius.lg, padding: `${theme.spacing.sm} ${theme.spacing.lg}`, cursor: scanning ? 'not-allowed' : 'pointer', fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold, whiteSpace: 'nowrap' }}
        >
          {scanning ? '⏳ Scanning…' : '🔄 Run Scan'}
        </button>
      </div>

      {error && (
        <div style={{ margin: theme.spacing.md, padding: theme.spacing.md, backgroundColor: '#fff0f0', color: '#8b0000', borderRadius: theme.borderRadius.md, border: '1px solid #ffb3b3' }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: theme.spacing.lg, color: theme.ui.text.secondary }}>Loading…</div>
        ) : sortedSymbols.length === 0 ? (
          <div style={{ padding: theme.spacing.lg, color: theme.ui.text.secondary }}>No stocks found. Run a scan.</div>
        ) : (
          <ChartView
            stocks={sortedSymbols}
            stockData={stockData}
            livePriceData={new Map()}
            holdings={new Set()}
            watchlistStocks={new Set()}
            onToggleHolding={() => {}}
            showWatchButton={false}
            showDeleteButton={false}
            initialExchange="NSE"
          />
        )}
      </div>
    </div>
  );
};

export default IndianStocks;
