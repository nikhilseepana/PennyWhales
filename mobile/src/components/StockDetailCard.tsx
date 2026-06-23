import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScanStock } from '../types/data';

const C = {
  bg:          '#f1f5f9',
  card:        '#ffffff',
  appBar:      '#0f172a',
  accent:      '#3b82f6',
  textPrimary: '#1e293b',
  textSec:     '#64748b',
  textMuted:   '#94a3b8',
  border:      '#e2e8f0',
  up:          '#16a34a',
  down:        '#dc2626',
  upBg:        '#dcfce7',
  downBg:      '#fee2e2',
  upBorder:    '#bbf7d0',
  downBorder:  '#fecaca',
};

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const FIRE_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#f59e0b',
  2: '#f97316',
  3: '#ef4444',
  4: '#dc2626',
  5: '#991b1b',
};

function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v == null) return '—';
  return v.toFixed(digits);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtMoney(v: number | null | undefined): string {
  if (!v || v <= 0) return '—';
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v.toFixed(1)}M`;
}

function fmtVol(v: number | null | undefined): string {
  if (!v || v <= 0) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function PerfCell({ label, value }: { label: string; value: number | null | undefined }) {
  const up = value != null && value > 0;
  const dn = value != null && value < 0;
  return (
    <View style={[styles.perfCell, up ? styles.perfUp : dn ? styles.perfDown : styles.perfNeutral]}>
      <Text style={styles.perfLabel}>{label}</Text>
      <Text style={[styles.perfValue, up ? styles.perfValueUp : dn ? styles.perfValueDown : styles.perfValueNeutral]}>
        {value != null ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—'}
      </Text>
    </View>
  );
}

function HoldingCell({
  label, pct, mv, change,
}: { label: string; pct?: number | null; mv?: number | null; change?: number | null }) {
  return (
    <View style={styles.holdingCell}>
      <Text style={styles.holdingLabel}>{label}</Text>
      <Text style={styles.holdingPct}>{fmtNum(pct)}%</Text>
      <Text style={styles.holdingMv}>{fmtMoney(mv)}</Text>
      {change != null && change !== 0 && (
        <Text style={[styles.holdingChange, { color: change > 0 ? C.up : C.down }]}>
          {change > 0 ? '+' : ''}{change.toFixed(2)}%
        </Text>
      )}
    </View>
  );
}

interface Props {
  stock: ScanStock;
  onClose: () => void;
  onOpenChart: (symbol: string) => void;
}

export default function StockDetailCard({ stock, onClose, onOpenChart }: Props) {
  const fireColor = FIRE_COLORS[stock.fire_level ?? 0] ?? C.textMuted;
  const priceChange = stock.previous_close && stock.price
    ? ((stock.price - stock.previous_close) / stock.previous_close) * 100
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.appBar} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticker}>{stock.ticker}</Text>
          {stock.company_name && (
            <Text style={styles.companyName} numberOfLines={1}>{stock.company_name}</Text>
          )}
        </View>
        <Pressable
          onPress={() => onOpenChart(stock.ticker)}
          style={styles.chartBtn}
          hitSlop={12}>
          <Ionicons name="bar-chart" size={18} color="#ffffff" />
          <Text style={styles.chartBtnText}>Chart</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Price ── */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${fmtNum(stock.price, 2)}</Text>
            {priceChange != null && (
              <View style={[styles.changePill, { backgroundColor: priceChange >= 0 ? C.upBg : C.downBg }]}>
                <Text style={[styles.changeText, { color: priceChange >= 0 ? C.up : C.down }]}>
                  {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </Text>
              </View>
            )}
            {/* Fire badge */}
            {(stock.fire_level ?? 0) > 0 && (
              <View style={[styles.fireBadge, { borderColor: fireColor }]}>
                <Text style={[styles.fireText, { color: fireColor }]}>
                  {'🔥'.repeat(Math.min(stock.fire_level ?? 0, 5))}
                </Text>
              </View>
            )}
            {/* Recommendation */}
            {stock.recommendation && (
              <View style={[
                styles.recBadge,
                { backgroundColor: stock.recommendation === 'STRONG_BUY' ? '#dc2626' : stock.recommendation === 'BUY' ? '#f97316' : '#f59e0b' }
              ]}>
                <Text style={styles.recText}>
                  {stock.recommendation === 'STRONG_BUY' ? 'STRONG BUY' : stock.recommendation}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          <View style={styles.tagRow}>
            {stock.sector && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{stock.sector}</Text>
              </View>
            )}
            {stock.industry && (
              <View style={[styles.tag, styles.tagGray]}>
                <Text style={styles.tagText}>{stock.industry}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.statsGrid}>
          {stock.market_cap != null && stock.market_cap > 0 && (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Mkt Cap</Text>
              <Text style={styles.statValue}>{fmtMoney(stock.market_cap)}</Text>
            </View>
          )}
          {stock.avg_volume != null && stock.avg_volume > 0 && (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Avg Vol</Text>
              <Text style={styles.statValue}>{fmtVol(stock.avg_volume)}</Text>
            </View>
          )}
          {stock.employee_count != null && stock.employee_count > 0 && (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Employees</Text>
              <Text style={styles.statValue}>
                {stock.employee_count >= 1000
                  ? `${(stock.employee_count / 1000).toFixed(1)}K`
                  : String(stock.employee_count)}
              </Text>
            </View>
          )}
          {stock.inst_own != null && (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Inst. Own</Text>
              <Text style={styles.statValue}>{fmtNum(stock.inst_own)}%</Text>
            </View>
          )}
          {stock.inst_trans != null && stock.inst_trans !== 0 && (
            <View style={[styles.statCell, { borderColor: stock.inst_trans > 0 ? C.upBorder : C.downBorder, backgroundColor: stock.inst_trans > 0 ? C.upBg : C.downBg }]}>
              <Text style={styles.statLabel}>Inst. Chg</Text>
              <Text style={[styles.statValue, { color: stock.inst_trans > 0 ? C.up : C.down }]}>
                {fmtPct(stock.inst_trans)}
              </Text>
            </View>
          )}
          {stock.sma200 != null && (
            <View style={[styles.statCell, { borderColor: stock.sma200 > 0 ? C.upBorder : C.downBorder, backgroundColor: stock.sma200 > 0 ? C.upBg : C.downBg }]}>
              <Text style={styles.statLabel}>vs 200 SMA</Text>
              <Text style={[styles.statValue, { color: stock.sma200 > 0 ? C.up : C.down }]}>
                {fmtPct(stock.sma200)}
              </Text>
            </View>
          )}
          {stock.ipo_date && (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>IPO</Text>
              <Text style={styles.statValue}>{stock.ipo_date}</Text>
            </View>
          )}
        </View>

        {/* ── Institutional Holdings ── */}
        <Text style={styles.sectionTitle}>Institutional Holdings</Text>
        <View style={styles.holdingsGrid}>
          <HoldingCell label="BlackRock" pct={stock.blackrock_pct} mv={stock.blackrock_market_value} change={stock.blackrock_change} />
          <HoldingCell label="Vanguard"  pct={stock.vanguard_pct}  mv={stock.vanguard_market_value}  change={stock.vanguard_change} />
          <HoldingCell label="State St." pct={stock.statestreet_pct} mv={stock.statestreet_market_value} change={stock.statestreet_change} />
        </View>

        {/* ── Performance ── */}
        {stock.performance && (
          <>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.perfGrid}>
              <PerfCell label="Day"     value={stock.performance.day} />
              <PerfCell label="Week"    value={stock.performance.week} />
              <PerfCell label="Month"   value={stock.performance.month} />
              <PerfCell label="Quarter" value={stock.performance.quarter} />
              <PerfCell label="½ Year"  value={stock.performance.halfYear} />
              <PerfCell label="YTD"     value={stock.performance.ytd} />
              <PerfCell label="1 Year"  value={stock.performance.year} />
            </View>
          </>
        )}

        {/* ── Description ── */}
        {stock.description && (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.descBox}>
              <Text style={styles.descText}>{stock.description}</Text>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.appBar,
    paddingTop: STATUSBAR_HEIGHT + 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 6,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  ticker:       { color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  companyName:  { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  chartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  chartBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  scroll:       { flex: 1 },
  section: {
    backgroundColor: C.card, margin: 12, borderRadius: 16, padding: 16,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  priceRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  price:        { fontSize: 32, fontWeight: '800', color: C.textPrimary },
  changePill:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  changeText:   { fontSize: 14, fontWeight: '700' },
  fireBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  fireText:     { fontSize: 13 },
  recBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  recText:      { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#eff6ff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  tagGray: { backgroundColor: '#f1f5f9', borderColor: C.border },
  tagText:      { fontSize: 11, fontWeight: '600', color: C.textSec },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 14, marginTop: 8, marginBottom: 4,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 8, gap: 0,
  },
  statCell: {
    width: '33.33%',
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    padding: 10,
  },
  statLabel: { fontSize: 10, fontWeight: '600', color: C.textMuted, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  holdingsGrid: {
    flexDirection: 'row',
    marginHorizontal: 12, gap: 8, marginBottom: 4,
  },
  holdingCell: {
    flex: 1, backgroundColor: C.card,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border,
    elevation: 1,
  },
  holdingLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  holdingPct:   { fontSize: 18, fontWeight: '800', color: C.accent },
  holdingMv:    { fontSize: 11, color: C.textSec, marginTop: 2 },
  holdingChange:{ fontSize: 11, fontWeight: '700', marginTop: 2 },
  perfGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: 12, gap: 8, marginBottom: 4,
  },
  perfCell: {
    width: '13%', flex: 1,
    borderRadius: 10, padding: 8, borderWidth: 1,
    alignItems: 'center',
  },
  perfUp:       { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  perfDown:     { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  perfNeutral:  { backgroundColor: C.card, borderColor: C.border },
  perfLabel:    { fontSize: 9, fontWeight: '700', color: C.textMuted, marginBottom: 2 },
  perfValue:    { fontSize: 11, fontWeight: '800' },
  perfValueUp:  { color: C.up },
  perfValueDown:{ color: C.down },
  perfValueNeutral: { color: C.textSec },
  descBox: {
    backgroundColor: C.card, marginHorizontal: 12,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  descText:     { fontSize: 13, color: C.textSec, lineHeight: 20 },
});
