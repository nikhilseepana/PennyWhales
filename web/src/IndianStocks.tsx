import React, { useEffect, useMemo, useState } from 'react';
import api from './api';
import { theme } from './theme';

const CHARTINK_SCAN_LINK = 'scanlink:8816f4f438ed5b5c82a674abfdc4d930';

const buildChartinkStockUrl = (ticker: string): string =>
  `https://chartink.com/stocks-new?from_scan=1&scan_link=${encodeURIComponent(CHARTINK_SCAN_LINK)}&symbol=${encodeURIComponent(ticker)}&timeframe=Daily`;

const IndianStocks: React.FC = () => {
  const [lastScanSymbols, setLastScanSymbols] = useState<string[]>([]);
  const [scrapedAt, setScrapedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    try {
      const result = await api.getIndiaStocks(false);
      setLastScanSymbols(result.additions || []);
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
          setLastScanSymbols(result.additions || []);
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

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return q ? lastScanSymbols.filter(s => s.includes(q)) : lastScanSymbols;
  }, [lastScanSymbols, query]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: theme.typography.fontFamily }}>

      <div style={{ padding: theme.spacing.lg, borderBottom: `1px solid ${theme.ui.border}`, backgroundColor: theme.ui.surface, flexShrink: 0, display: 'flex', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: theme.typography.fontSize.xxl, fontWeight: theme.typography.fontWeight.bold, color: theme.ui.text.primary }}>
            🇮🇳 India Scan
          </h1>
          {scrapedAt && (
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.ui.text.secondary, fontSize: theme.typography.fontSize.sm }}>
              Last scan: {new Date(scrapedAt).toLocaleString()} · {lastScanSymbols.length} stock(s)
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${theme.ui.border}`, overflowY: 'auto', backgroundColor: theme.ui.surface }}>
          {loading ? (
            <div style={{ padding: theme.spacing.lg, color: theme.ui.text.secondary, fontSize: theme.typography.fontSize.sm }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: theme.spacing.lg, color: theme.ui.text.secondary, fontSize: theme.typography.fontSize.sm }}>
              {lastScanSymbols.length === 0 ? 'No scan results yet. Run a scan.' : 'No matches.'}
            </div>
          ) : (
            filtered.map(symbol => (
              <div
                key={symbol}
                onClick={() => setSelected(symbol)}
                style={{
                  padding: `10px ${theme.spacing.md}`,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${theme.ui.border}`,
                  backgroundColor: selected === symbol ? theme.status.info + '22' : 'transparent',
                  borderLeft: selected === symbol ? `3px solid ${theme.status.info}` : '3px solid transparent',
                  fontWeight: selected === symbol ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal,
                  color: theme.ui.text.primary,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                {symbol}
              </div>
            ))
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.ui.background }}>
          {selected ? (
            <>
              <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, borderBottom: `1px solid ${theme.ui.border}`, backgroundColor: theme.ui.surface, fontSize: theme.typography.fontSize.sm, display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                <strong style={{ color: theme.ui.text.primary, fontSize: theme.typography.fontSize.base }}>{selected}</strong>
                <a href={buildChartinkStockUrl(selected)} target="_blank" rel="noreferrer"
                  style={{ padding: '4px 12px', backgroundColor: theme.status.info, color: 'white', borderRadius: theme.borderRadius.md, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                  Open in Chartink ↗
                </a>
                <a href={`https://www.tradingview.com/chart/?symbol=NSE%3A${selected}`} target="_blank" rel="noreferrer"
                  style={{ padding: '4px 12px', backgroundColor: '#131722', color: 'white', borderRadius: theme.borderRadius.md, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                  TradingView ↗
                </a>
              </div>
              <iframe
                key={selected}
                src={`https://www.tradingview.com/widgetembed/?frameElementId=tv&symbol=NSE%3A${selected}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Asia%2FKolkata&withdateranges=1&showpopupbutton=1`}
                title={selected}
                style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                allow="fullscreen"
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.ui.text.secondary, flexDirection: 'column', gap: theme.spacing.md }}>
              <div style={{ fontSize: '2.5rem' }}>📈</div>
              <div style={{ fontSize: theme.typography.fontSize.base }}>Select a stock from the list to view its chart</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndianStocks;
