import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import InAppBrowser from './src/components/InAppBrowser';
import StockDetailCard from './src/components/StockDetailCard';
import {
  getIndiaStocks,
  getUsDailyMiniHistory,
  getScanStockMap,
  getWatchlists,
} from './src/services/githubData';
import {
  dispatchWorkflow,
  REPO_FULL_NAME,
  WORKFLOW_REF,
} from './src/services/githubActions';
import { _mref } from './src/cfg/appdata';
import { IndiaStockEntry, ScanStock, UsDailyMiniEntry, Watchlist } from './src/types/data';

type TabKey = 'india' | 'watchlists' | 'usmini' | 'actions';

const TABS: Array<{ key: TabKey; label: string; icon: IoniconsIconName; iconActive: IoniconsIconName }> = [
  { key: 'india',      label: 'India',      icon: 'trending-up-outline',   iconActive: 'trending-up' },
  { key: 'watchlists', label: 'Watchlists', icon: 'eye-outline',            iconActive: 'eye' },
  { key: 'usmini',     label: 'US Mini',    icon: 'search-outline',         iconActive: 'search' },
  { key: 'actions',    label: 'Actions',    icon: 'flash-outline',          iconActive: 'flash' },
];

const TRIGGER_WORKFLOWS = [
  { key: 'us-mini', label: 'Run US Mini Scan', file: 'mini-scan-alert.yml' },
  { key: 'india-mini', label: 'Run India Mini Scan', file: 'mini-scan-alert-india.yml' },
  { key: 'us-daily', label: 'Run US Daily Mini', file: 'us-daily-mini-alert.yml' },
] as const;

const C = {
  bg:          '#f1f5f9',
  card:        '#ffffff',
  appBar:      '#0f172a',
  accent:      '#3b82f6',
  textPrimary: '#1e293b',
  textSec:     '#64748b',
  textMuted:   '#94a3b8',
  border:      '#e2e8f0',
  danger:      '#ef4444',
  success:     '#22c55e',
  badgeBg:     '#eff6ff',
  badgeText:   '#2563eb',
};

export default function App() {
  const [activeTab, setActiveTab]   = useState<TabKey>('india');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lastSync, setLastSync]     = useState<string | null>(null);
  const [browser, setBrowser]       = useState<{ url: string; title: string } | null>(null);
  const [stockDetail, setStockDetail] = useState<ScanStock | null>(null);
  const [scanMap, setScanMap]         = useState<Map<string, ScanStock>>(new Map());

  const [indiaStocks, setIndiaStocks]       = useState<IndiaStockEntry[]>([]);
  const [indiaUpdatedAt, setIndiaUpdatedAt] = useState<string | undefined>();
  const [watchlists, setWatchlists]         = useState<Watchlist[]>([]);
  const [usDailyMini, setUsDailyMini]       = useState<UsDailyMiniEntry[]>([]);

  const loadAll = async () => {
    try {
      setError(null);
      const [india, wl, usMini] = await Promise.all([
        getIndiaStocks(),
        getWatchlists(),
        getUsDailyMiniHistory(),
      ]);
      setIndiaStocks(india.stocks);
      setIndiaUpdatedAt(india.updatedAt);
      setWatchlists(wl);
      setUsDailyMini(usMini);
      setLastSync(new Date().toLocaleTimeString());
      // Load scan map in background (non-blocking)
      getScanStockMap().then(setScanMap).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Always use the bundled cfg if it's a full-length token (>= 30 chars)
  // This ensures stale/truncated AsyncStorage values are never used
  useEffect(() => {
    const bundled = _mref?.trim() ?? '';
    if (bundled.length >= 30) {
      setGithubToken(bundled);
      AsyncStorage.setItem('_pw_cfg_a', bundled).catch(() => {});
    } else {
      AsyncStorage.getItem('_pw_cfg_a').then((val) => {
        if (val && val.trim().length >= 30) setGithubToken(val.trim());
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { loadAll(); }, []);
  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const indiaRows = useMemo(
    () => indiaStocks.map((s) => s.symbol).filter(Boolean),
    [indiaStocks],
  );

  // ─── In-app browser helpers ───────────────────────────────────────────────

  const openInApp = useCallback((url: string, title: string) => {
    setBrowser({ url, title });
  }, []);
  const openStockDetail = useCallback((symbol: string) => {
    const s = scanMap.get(symbol.toUpperCase());
    if (s) {
      setStockDetail(s);
    } else {
      // Fallback: open TradingView if no scan data
      openInApp(
        `https://www.tradingview.com/chart/?symbol=${symbol}`,
        `${symbol} — TradingView`,
      );
    }
  }, [scanMap, openInApp]);
  const openChartInk = useCallback((symbol: string) => {
    openInApp(
      `https://chartink.com/stocks/${symbol.toLowerCase()}`,
      `${symbol} — ChartInk`,
    );
  }, [openInApp]);

  const openTradingViewUS = useCallback((symbol: string) => {
    openInApp(
      `https://www.tradingview.com/chart/?symbol=${symbol}`,
      `${symbol} — TradingView`,
    );
  }, [openInApp]);

  // India → ChartInk directly; US → TradingView directly
  const onIndiaStockPress = useCallback((symbol: string) => {
    openChartInk(symbol);
  }, [openChartInk]);

  const onUSStockPress = useCallback((symbol: string) => {
    openStockDetail(symbol);
  }, [openStockDetail]);

  // ─── US ticker sheet ──────────────────────────────────────────────────────

  const [tickerSheet, setTickerSheet] = useState<{ date: string; tickers: string[] } | null>(null);

  // ─── Watchlist detail ─────────────────────────────────────────────────────

  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const openTickerSheet = useCallback((item: UsDailyMiniEntry) => {
    if (!item.tickers?.length) return;
    setTickerSheet({
      date: item.scanDate
        ? new Date(item.scanDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })
        : 'Scan',
      tickers: item.tickers,
    });
  }, []);

  const onRunWorkflow = useCallback(async (workflowFile: string, label: string) => {
    const token = githubToken.trim();
    if (!token) {
      setWorkflowNotice({ kind: 'error', text: 'Enter a GitHub token first.' });
      return;
    }

    setWorkflowNotice(null);
    setRunningWorkflow(workflowFile);
    try {
      await dispatchWorkflow({
        workflowFile,
        token,
      });
      setWorkflowNotice({
        kind: 'ok',
        text: `${label} triggered. Refresh in 1-2 mins for updated data.`,
      });
    } catch (err) {
      setWorkflowNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to trigger workflow.',
      });
    } finally {
      setRunningWorkflow(null);
    }
  }, [githubToken]);

  // ─── Tab renders ─────────────────────────────────────────────────────────

  const renderIndiaTab = () => (
    <FlatList
      data={indiaRows}
      keyExtractor={(item) => item}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
      ListHeaderComponent={
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>India Watchlist</Text>
              <Text style={styles.summaryCount}>{indiaRows.length} symbols</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NSE</Text>
            </View>
          </View>
          {indiaUpdatedAt && (
            <Text style={styles.summaryMeta}>
              Updated {new Date(indiaUpdatedAt).toLocaleString()}
            </Text>
          )}
        </View>
      }
      renderItem={({ item, index }) => (
        <Pressable
          onPress={() => onIndiaStockPress(item)}
          style={({ pressed }) => [styles.stockCard, pressed && styles.cardPressed]}>
          <View style={styles.stockCardLeft}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.stockSymbol}>{item}</Text>
          </View>
          <View style={styles.stockCardRight}>
            <View style={styles.nseTag}>
              <Text style={styles.nseTagText}>NSE</Text>
            </View>
            <Text style={styles.chartHint}>
              <Ionicons name="bar-chart-outline" size={16} color={C.textMuted} />
            </Text>
          </View>
        </Pressable>
      )}
    />
  );

  const renderWatchlistsTab = () => {
    // ── Detail view: one watchlist ──
    if (selectedWatchlist) {
      return (
        <View style={styles.contentArea}>
          {/* Header */}
          <View style={styles.wlDetailHeader}>
            <Pressable onPress={() => setSelectedWatchlist(null)} style={styles.wlBackBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.wlDetailTitle}>{selectedWatchlist.name}</Text>
              <Text style={styles.wlDetailMeta}>
                {selectedWatchlist.stocks?.length ?? 0} stocks
                {selectedWatchlist.updated
                  ? ` · Updated ${new Date(selectedWatchlist.updated).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedWatchlist.stocks?.length ?? 0}</Text>
            </View>
          </View>

          {/* Stock list */}
          <FlatList
            data={selectedWatchlist.stocks ?? []}
            keyExtractor={(s) => s}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState message="No stocks in this watchlist" />}
            renderItem={({ item: symbol, index }) => (
              <Pressable
                onPress={() => openStockDetail(symbol)}
                style={({ pressed }) => [styles.stockCard, pressed && styles.cardPressed]}>
                <View style={styles.stockCardLeft}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stockSymbol}>{symbol}</Text>
                </View>
                <View style={styles.stockCardRight}>
                  <Ionicons name="bar-chart-outline" size={16} color={C.textMuted} />
                </View>
              </Pressable>
            )}
          />
        </View>
      );
    }

    // ── List view: all watchlists ──
    return (
      <FlatList
        data={watchlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        ListEmptyComponent={<EmptyState message="No watchlists found" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedWatchlist(item)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.wlRowRight}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.stocks?.length ?? 0}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </View>
            </View>
            {item.stocks?.length > 0 && (
              <Text style={styles.cardTickers} numberOfLines={1}>
                {item.stocks.slice(0, 5).join(' · ')}
                {item.stocks.length > 5 ? ` +${item.stocks.length - 5} more` : ''}
              </Text>
            )}
            {item.updated && (
              <Text style={styles.cardMeta}>
                Updated {new Date(item.updated).toLocaleDateString()}
              </Text>
            )}
          </Pressable>
        )}
      />
    );
  };

  const renderUSMiniTab = () => (
    <FlatList
      data={usDailyMini}
      keyExtractor={(item, index) => item.id ?? `${item.scanDate ?? 'scan'}-${index}`}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
      ListEmptyComponent={<EmptyState message="No scan history found" />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openTickerSheet(item)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {item.scanDate
                ? new Date(item.scanDate).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                : 'Unknown date'}
            </Text>
            <View style={[styles.badge, item.totalMatched ? styles.badgeGreen : undefined]}>
              <Text style={[styles.badgeText, item.totalMatched ? styles.badgeTextGreen : undefined]}>
                {item.totalMatched ?? 0} matched
              </Text>
            </View>
          </View>
          {(item.tickers?.length ?? 0) > 0 && (
            <>
              <Text style={styles.cardTickers} numberOfLines={2}>
                {(item.tickers ?? []).slice(0, 8).join(' · ')}
                {(item.tickers?.length ?? 0) > 8
                  ? ` +${(item.tickers?.length ?? 0) - 8} more`
                  : ''}
              </Text>
              <Text style={styles.tapHint}>Tap to open charts →</Text>
            </>
          )}
        </Pressable>
      )}
    />
  );

  const renderActionsTab = () => (
    <ScrollView
      contentContainerStyle={styles.actionsContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trigger GitHub Workflows</Text>
        <Text style={styles.actionsMeta}>
          Repository: {REPO_FULL_NAME}
        </Text>
        <Text style={styles.actionsMeta}>
          Branch: {WORKFLOW_REF}
        </Text>
        {!githubToken && (
          <Text style={styles.actionsNoticeError}>
            No credentials configured. Contact admin.
          </Text>
        )}

        <View style={styles.actionsList}>
          {TRIGGER_WORKFLOWS.map((wf) => {
            const isRunning = runningWorkflow === wf.file;
            return (
              <Pressable
                key={wf.key}
                disabled={isRunning}
                onPress={() => onRunWorkflow(wf.file, wf.label)}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && !isRunning && styles.cardPressed,
                  isRunning && styles.actionButtonDisabled,
                ]}>
                <Text style={styles.actionButtonText}>{wf.label}</Text>
                {isRunning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="play" size={16} color="#ffffff" />
                )}
              </Pressable>
            );
          })}
        </View>

        {workflowNotice && (
          <Text
            style={[
              styles.actionsNotice,
              workflowNotice.kind === 'ok' ? styles.actionsNoticeOk : styles.actionsNoticeError,
            ]}>
            {workflowNotice.text}
          </Text>
        )}
      </View>
    </ScrollView>
  );

  // ─── Root ─────────────────────────────────────────────────────────────────

  if (stockDetail) {
    return (
      <StockDetailCard
        stock={stockDetail}
        onClose={() => setStockDetail(null)}
        onOpenChart={(sym) => {
          setStockDetail(null);
          openTradingViewUS(sym);
        }}
      />
    );
  }

  if (browser) {
    return (
      <InAppBrowser
        url={browser.url}
        title={browser.title}
        onClose={() => setBrowser(null)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.appBar} />

      {/* ── App Bar ── */}
      <View style={styles.appBar}>
        <View style={styles.appBarInner}>
          <View>
            <Text style={styles.appBarTitle}>PennyWhales</Text>
            {lastSync && <Text style={styles.appBarSub}>Synced {lastSync}</Text>}
          </View>
          <Pressable
            onPress={() => { setRefreshing(true); loadAll(); }}
            style={({ pressed }) => [styles.syncBtn, pressed && styles.syncBtnPressed]}
            hitSlop={12}>
            <Ionicons name="refresh" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={styles.contentArea}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingText}>Loading from GitHub…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="warning-outline" size={48} color="#f59e0b" />
            <Text style={styles.errorTitle}>Could not load data</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <Pressable onPress={loadAll} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activeTab === 'india'      && renderIndiaTab()}
            {activeTab === 'watchlists' && renderWatchlistsTab()}
            {activeTab === 'usmini'     && renderUSMiniTab()}
            {activeTab === 'actions'    && renderActionsTab()}
          </>
        )}
      </View>

      {/* ── US Ticker Sheet ── */}
      <Modal
        visible={!!tickerSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setTickerSheet(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setTickerSheet(null)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{tickerSheet?.date ?? 'Tickers'}</Text>
              <Pressable onPress={() => setTickerSheet(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={C.textSec} />
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>Tap a ticker to open in-app chart</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.tickerGrid}>
                {(tickerSheet?.tickers ?? []).map((ticker) => (
                  <TouchableOpacity
                    key={ticker}
                    style={styles.tickerChip}
                    onPress={() => { setTickerSheet(null); onUSStockPress(ticker); }}
                    activeOpacity={0.7}>
                    <Text style={styles.tickerChipText}>{ticker}</Text>
                    <Ionicons name="bar-chart-outline" size={14} color={C.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabItem}
              hitSlop={8}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={24}
                color={active ? C.accent : C.textMuted}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="mail-unread-outline" size={44} color={C.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  appBar: {
    backgroundColor: C.appBar,
    paddingTop: STATUSBAR_HEIGHT + 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  appBarInner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appBarTitle:  { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  appBarSub:    { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  syncBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  syncBtnPressed: { backgroundColor: 'rgba(255,255,255,0.22)' },
  syncBtnText:    { color: '#fff', fontSize: 20, lineHeight: 22 },
  contentArea:    { flex: 1 },
  listContent:    { paddingTop: 12, paddingBottom: 8 },
  summaryCard: {
    backgroundColor: C.card, marginHorizontal: 14, marginBottom: 10,
    borderRadius: 16, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 13, color: C.textSec, fontWeight: '500' },
  summaryCount: { fontSize: 26, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  summaryMeta:  { fontSize: 11, color: C.textMuted, marginTop: 8 },
  stockCard: {
    backgroundColor: C.card, marginHorizontal: 14, marginVertical: 4,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  cardPressed:    { opacity: 0.75 },
  stockCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indexBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.badgeBg, alignItems: 'center', justifyContent: 'center',
  },
  indexBadgeText: { fontSize: 11, fontWeight: '700', color: C.accent },
  stockSymbol:    { fontSize: 16, fontWeight: '700', color: C.textPrimary, letterSpacing: 0.4 },
  nseTag:         { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  nseTagText:     { fontSize: 10, fontWeight: '700', color: '#16a34a', letterSpacing: 0.5 },
  chartHint:      { fontSize: 16, opacity: 0.5 },
  card: {
    backgroundColor: C.card, marginHorizontal: 14, marginVertical: 4,
    borderRadius: 14, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: C.textPrimary, flex: 1, marginRight: 8 },
  cardTickers:  { marginTop: 8, fontSize: 12, color: C.textSec, lineHeight: 18 },
  cardMeta:     { marginTop: 6, fontSize: 11, color: C.textMuted },
  tapHint:      { marginTop: 6, fontSize: 11, color: C.accent, fontWeight: '500' },
  badge: {
    backgroundColor: C.badgeBg, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText:      { fontSize: 12, fontWeight: '700', color: C.badgeText },
  badgeGreen:     { backgroundColor: '#f0fdf4' },
  badgeTextGreen: { color: '#16a34a' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  loadingText: { marginTop: 12, color: C.textSec, fontSize: 14 },
  errorIcon:   { fontSize: 40, marginBottom: 4 },
  errorTitle:  { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  errorMsg:    { fontSize: 13, color: C.textSec, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 16, backgroundColor: C.accent,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
  },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:  { fontSize: 36 },
  emptyText:  { color: C.textSec, fontSize: 14 },
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '75%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 4,
  },
  sheetTitle:  { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  sheetClose:  { fontSize: 16, color: C.textSec, fontWeight: '600' },
  sheetSub:    { fontSize: 12, color: C.textMuted, paddingHorizontal: 20, marginBottom: 16 },
  sheetScroll: { paddingHorizontal: 16 },
  tickerGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 },
  tickerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.badgeBg, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: C.border,
  },
  tickerChipText: { fontSize: 14, fontWeight: '700', color: C.accent, letterSpacing: 0.4 },
  tickerChipIcon: { fontSize: 14 },
  tabBar: {
    flexDirection: 'row', backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6, paddingTop: 8,
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 2,
  },
  tabIcon:       { fontSize: 20, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel:      { fontSize: 10, fontWeight: '600', color: C.textMuted, letterSpacing: 0.2 },
  tabLabelActive: { color: C.accent },
  tabIndicator: {
    position: 'absolute', top: 0, width: 24, height: 2,
    borderRadius: 2, backgroundColor: C.accent,
  },
  // ── Watchlist detail
  wlDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  wlBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  wlDetailTitle: {
    fontSize: 17, fontWeight: '700', color: C.textPrimary,
  },
  wlDetailMeta: {
    fontSize: 12, color: C.textSec, marginTop: 2,
  },
  wlRowRight: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  actionsContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  actionsMeta: {
    marginTop: 6,
    fontSize: 12,
    color: C.textSec,
  },
  actionsHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: C.textMuted,
  },
  tokenRow: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: C.textPrimary,
  },
  tokenToggle: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsList: {
    marginTop: 14,
    gap: 10,
  },
  actionButton: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionsNotice: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionsNoticeOk: {
    color: C.success,
  },
  actionsNoticeError: {
    color: C.danger,
  },
});
