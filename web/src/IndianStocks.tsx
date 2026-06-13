import React, { useEffect, useMemo, useState } from 'react';
import api from './api';
import { theme } from './theme';
import { Stock } from './types';
import ChartView from './components/ChartView';

const IndianStocks: React.FC = () => {
  const [displaySymbols, setDisplaySymbols] = useState<string[]>([]);
  const [newAdditions, setNewAdditions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  const loadIndiaStocks = async (refresh: boolean = false): Promise<void> => {
    try {
      if (refresh) {
        setLoading(true);
      }
      setError(null);
      const result = await api.getIndiaStocks(refresh);
      if (!result.success) {
        setError(result.error || 'Failed to fetch Indian stocks');
        return;
      }
      setWarning(result.warning || null);
      const additions = result.additions || [];
      const symbols = result.symbols || [];
      const mergedList = [...additions, ...symbols].filter(
        (symbol, index, arr) => arr.indexOf(symbol) === index
      );

      setNewAdditions(new Set(additions));
      setDisplaySymbols(mergedList);

      if (refresh) {
        if (additions.length > 0) {
          setWarning((prev) => prev || `Showing merged list. ${additions.length} new addition(s) are pinned on top.`);
        } else {
          setWarning((prev) => prev || 'No new additions in this refresh. Showing current daily symbols.');
        }
      }
    } catch (err) {
      setError('Failed to fetch Indian stocks from Chartink');
      console.error('Error loading Indian stocks:', err);
    } finally {
      setInitialLoading(false);
      if (refresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadIndiaStocks(false);
  }, []);

  const filteredSymbols = useMemo(() => {
    if (!displaySymbols) return [];
    const q = query.trim().toUpperCase();
    if (!q) return displaySymbols;
    return displaySymbols.filter((symbol) => symbol.includes(q));
  }, [displaySymbols, query]);

  const stocksForCards = useMemo<Stock[]>(() => {
    return filteredSymbols.map((symbol) => ({
      ticker: symbol,
      tradingview_symbol: `NSE:${symbol}`,
      price: 0,
      blackrock_pct: 0,
      vanguard_pct: 0,
      blackrock_source: 'chartink',
      vanguard_source: 'chartink',
      data_quality: 'symbol-only',
      sources_count: 1,
      discrepancy: false,
      notes: newAdditions.has(symbol)
        ? 'Chartink symbol-only stock (new addition)'
        : 'Chartink symbol-only stock',
      fire_level: newAdditions.has(symbol) ? 1 : 0,
      company_name: symbol,
    }));
  }, [filteredSymbols, newAdditions]);

  const copySymbols = async (): Promise<void> => {
    if (!filteredSymbols.length) return;
    try {
      await navigator.clipboard.writeText(filteredSymbols.join(', '));
    } catch (err) {
      console.error('Failed to copy symbols:', err);
    }
  };

  const stockDataMap = useMemo(() => {
    const map = new Map<string, Stock>();
    stocksForCards.forEach((stock) => map.set(stock.ticker, stock));
    return map;
  }, [stocksForCards]);

  const buildChartinkStockUrl = (ticker: string): string => {
    const scanLink = 'scanlink:646e1e0ba5323d67803938a9e3b6d3af';
    return `https://chartink.com/stocks-new?from_scan=1&scan_link=${encodeURIComponent(scanLink)}&symbol=${encodeURIComponent(ticker)}&timeframe=Daily`;
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: theme.typography.fontFamily,
      }}
    >
      <div
        style={{
          padding: theme.spacing.lg,
          borderBottom: `1px solid ${theme.ui.border}`,
          backgroundColor: theme.ui.surface,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.ui.text.primary,
          }}
        >
          🇮🇳 Indian Stocks
        </h1>
        <p
          style={{
            margin: `${theme.spacing.sm} 0 0 0`,
            color: theme.ui.text.secondary,
            fontSize: theme.typography.fontSize.base,
          }}
        >
          Symbols scraped from your Chartink screener (for example: ZEEL and similar NSE symbols).
        </p>
      </div>

      <div
        style={{
          flex: 1,
          padding: theme.spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          backgroundColor: theme.ui.background,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: theme.spacing.sm,
            flexWrap: 'wrap',
            marginBottom: theme.spacing.md,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => loadIndiaStocks(true)}
            disabled={loading}
            style={{
              border: 'none',
              backgroundColor: theme.status.info,
              color: 'white',
              borderRadius: theme.borderRadius.lg,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.bold,
              boxShadow: theme.ui.shadow.sm,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh (Merged Daily)'}
          </button>

          <button
            type="button"
            onClick={copySymbols}
            disabled={filteredSymbols.length === 0}
            style={{
              border: 'none',
              backgroundColor: theme.status.warning,
              color: 'white',
              borderRadius: theme.borderRadius.lg,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              cursor: filteredSymbols.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.bold,
              boxShadow: theme.ui.shadow.sm,
              whiteSpace: 'nowrap',
            }}
          >
            Copy Symbols
          </button>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter symbol (e.g. ZEE)"
            style={{
              border: `1px solid ${theme.ui.border}`,
              borderRadius: theme.borderRadius.lg,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              minWidth: 260,
              backgroundColor: theme.ui.surface,
              color: theme.ui.text.primary,
              boxShadow: theme.ui.shadow.sm,
              fontSize: theme.typography.fontSize.sm,
            }}
          />
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fff0f0',
              color: '#8b0000',
              border: '1px solid #ffb3b3',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            {error}
          </div>
        )}

        {warning && !error && (
          <div
            style={{
              backgroundColor: '#fff8e1',
              color: '#7a5b00',
              border: '1px solid #ffe08a',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            {warning}
          </div>
        )}

      

        <div
          style={{
            backgroundColor: theme.ui.surface,
            border: `1px solid ${theme.ui.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            flexGrow: 1,
            minHeight: 0,
          }}
        >
          {!loading && !initialLoading && filteredSymbols.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: theme.ui.text.secondary,
                padding: theme.spacing.lg,
              }}
            >
              <div
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  color: theme.ui.text.primary,
                  fontWeight: theme.typography.fontWeight.semibold,
                  marginBottom: theme.spacing.sm,
                }}
              >
                No Symbols Available
              </div>
              <div style={{ maxWidth: 520 }}>
                Refresh again or check your Chartink screener settings.
              </div>
            </div>
          ) : (
            <ChartView
              stocks={stocksForCards.map((stock) => stock.ticker)}
              stockData={stockDataMap}
              livePriceData={new Map()}
              holdings={new Set()}
              watchlistStocks={new Set()}
              onToggleHolding={() => {}}
              showWatchButton={false}
              showDeleteButton={false}
              showLastUpdated={false}
              customChartUrlBuilder={buildChartinkStockUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default IndianStocks;
