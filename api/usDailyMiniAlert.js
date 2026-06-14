#!/usr/bin/env node

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const telegramService = require('./telegramService');
const { scrapeFinvizScreener } = require('./finvizScraper');
const StockScanner = require('./stockScanner');
const { shouldExcludeStock } = require('./exclusionUtils');

const DEFAULT_DAILY_MINI_URL =
  'https://finviz.com/screener?v=411&f=cap_smallover%2Csh_relvol_o2%2Cta_highlow52w_b50h%2Cta_perf_d5o&ft=4';

function getConfiguredUrl() {
  return String(process.env.FINVIZ_SCREENER_URL_DAILY_MINI || '').trim() || DEFAULT_DAILY_MINI_URL;
}

async function resolveChatId() {
  const envChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (envChatId) {
    return envChatId;
  }

  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return null;
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return settings.telegramChatId || null;
  } catch (error) {
    return null;
  }
}

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }
  return `${Number(value).toFixed(2)}%`;
}

function moneyMB(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  const numeric = Number(value);
  if (Math.abs(numeric) >= 1000) {
    return `$${(numeric / 1000).toFixed(2)}B`;
  }

  return `$${numeric.toFixed(2)}M`;
}

function priceText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }
  return `$${Number(value).toFixed(2)}`;
}

function formatTimestamp() {
  const now = new Date();
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const date = `${parts.find(p => p.type === 'month').value}/${parts.find(p => p.type === 'day').value}/${parts.find(p => p.type === 'year').value}`;
  const time = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value} ${parts.find(p => p.type === 'dayPeriod').value.toLowerCase()}`;
  
  return `${date}, ${time}`;
}

function formatMessage({ url, inputCount, qualifyingStocks }) {
  const stamp = formatTimestamp();
  const total = qualifyingStocks.length;
  const preview = qualifyingStocks.slice(0, 12);

  if (inputCount === 0) {
    return [
      '📈 US Daily Mini Scan',
      `⏰ ${stamp}`,
      `🔎 Filters: ${url}`,
      '',
      'No stocks matched today.',
    ].join('\n');
  }

  if (total === 0) {
    return [
      '📈 US Daily Mini Scan',
      `⏰ ${stamp}`,
      `📦 Screener Matches: ${inputCount}`,
      `🔎 Filters: ${url}`,
      '',
      'No stocks passed fire-level filter today.',
    ].join('\n');
  }

  const lines = preview.flatMap((stock) => {
    const fireEmojis = '🔥'.repeat(stock.fire_level || 0);
    const brValue = Number(stock.blackrock_market_value || 0);
    const vgValue = Number(stock.vanguard_market_value || 0);
    const totalInstitutionalValue = brValue + vgValue;
    const marketCap = Number(stock.market_cap || 0);

    return [
      `${stock.ticker}: ${priceText(stock.price)} ${fireEmojis} (Fire ${stock.fire_level})`,
      `   BlackRock: ${pct(stock.blackrock_pct)} (${moneyMB(brValue)}) | Vanguard: ${pct(stock.vanguard_pct)} (${moneyMB(vgValue)})`,
      `   Total BR+VG: ${moneyMB(totalInstitutionalValue)} | Total Market Value: ${moneyMB(marketCap)}`,
      `   📊 [View Chart](https://www.tradingview.com/chart/?symbol=${stock.ticker})`,
      '',
    ];
  });

  const hasMore = total > preview.length;

  return [
    '📈 US Daily Mini Scan',
    `⏰ ${stamp}`,
    `📦 Screener Matches: ${inputCount}`,
    `🔥 Fire Qualified: ${total}`,
    `🔎 Filters: ${url}`,
    '',
    ...lines,
    hasMore ? `...and ${total - preview.length} more fire stocks` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function run() {
  const url = getConfiguredUrl();
  const chatId = await resolveChatId();

  if (!chatId) {
    throw new Error('No Telegram chat id found. Set TELEGRAM_CHAT_ID or configure data/settings.json');
  }

  console.log(`📊 Running US daily mini scan from: ${url}`);
  const screenerStocks = await scrapeFinvizScreener(url);
  const tickers = (screenerStocks || [])
    .map((stock) => String(stock.ticker || '').toUpperCase().trim())
    .filter(Boolean);

  const scanner = new StockScanner();
  const qualifyingStocks = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`🔎 [${i + 1}/${tickers.length}] Analyzing ${ticker}...`);

    try {
      const result = await scanner.analyzeTicker(ticker, true);
      if (result.success && result.data && Number(result.data.fire_level || 0) > 0) {
        if (shouldExcludeStock(result.data)) {
          console.log(`🚫 ${ticker}: excluded therapeutics/lending`);
        } else {
          qualifyingStocks.push(result.data);
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${ticker}: analysis failed (${error.message || error})`);
    }

    if (i < tickers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  qualifyingStocks.sort((a, b) => {
    const fireDiff = Number(b.fire_level || 0) - Number(a.fire_level || 0);
    if (fireDiff !== 0) return fireDiff;
    return Number(b.performance?.day || -999) - Number(a.performance?.day || -999);
  });

  const message = formatMessage({
    url,
    inputCount: tickers.length,
    qualifyingStocks,
  });
  const sent = await telegramService.sendMessage(chatId, message, null);

  if (!sent.success) {
    throw new Error(sent.error || 'Failed sending Telegram message');
  }

  console.log(
    `✅ Telegram sent. Screener matches: ${tickers.length}, fire-qualified: ${qualifyingStocks.length}`
  );
}

run().catch((error) => {
  console.error('❌ US daily mini alert failed:', error.message || error);
  process.exit(1);
});
