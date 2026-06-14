#!/usr/bin/env node

require('dotenv').config();

/**
 * Standalone Mini Scan Alert Script for Indian Stocks
 * Scans Indian stocks (under ₹50 and high volatility)
 * Sends Telegram notification when found
 * 
 * Config: Reads chatId from /api/data/settings.json
 * Bot token: Use PW_NOTIFY_KEY environment variable (or TELEGRAM_BOT_TOKEN fallback)
 * Usage: node miniScanAlert-india.js
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { scrapeChartinkSymbols } = require('./chartinkScraper');
const DEFAULT_CHARTINK_INDIA_SCREENER_URL =
  'https://chartink.com/screener/down-by-50-with-moment';

// ============= CONFIG =============
const TELEGRAM_BOT_TOKEN = process.env.PW_NOTIFY_KEY || process.env.TELEGRAM_BOT_TOKEN;

// Load chat ID from settings.json
let TELEGRAM_CHAT_ID = null;
try {
  const settingsPath = path.join(__dirname, 'data', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    TELEGRAM_CHAT_ID = settings.telegramChatId;
  }
} catch (error) {
  // Silently continue - will fail gracefully when trying to send
}

// Load Indian stocks list
let INDIA_STOCKS = [];
try {
  const stocksPath = path.join(__dirname, 'data', 'indiaStocks.json');
  if (fs.existsSync(stocksPath)) {
    const data = JSON.parse(fs.readFileSync(stocksPath, 'utf-8'));
    INDIA_STOCKS = data.symbols || [];
  }
} catch (error) {
  console.error('Failed to load Indian stocks list:', error.message);
}

function getConfiguredChartinkScreenerUrls() {
  const url = String(process.env.CHARTINK_SCREENER_URL || '').trim();
  return url || DEFAULT_CHARTINK_INDIA_SCREENER_URL;
}

function buildChartinkStockUrl(symbol) {
  const scanLink = String(process.env.CHARTINK_SCAN_LINK || '').trim();

  if (!scanLink) {
    return `https://chartink.com/stocks-new?from_scan=1&symbol=${encodeURIComponent(symbol)}&timeframe=daily`;
  }

  return `https://chartink.com/stocks-new?from_scan=1&scan_link=${encodeURIComponent(scanLink)}&symbol=${encodeURIComponent(symbol)}&timeframe=daily`;
}

function saveIndiaStocks(symbols) {
  try {
    const stocksPath = path.join(__dirname, 'data', 'indiaStocks.json');
    const existingSymbols = (() => {
      try {
        if (!fs.existsSync(stocksPath)) {
          return [];
        }

        const raw = fs.readFileSync(stocksPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.symbols)) {
          return [];
        }

        return parsed.symbols
          .map((symbol) => String(symbol).toUpperCase().trim())
          .filter(Boolean);
      } catch (readError) {
        return [];
      }
    })();

    const incomingSymbols = (symbols || [])
      .map((symbol) => String(symbol).toUpperCase().trim())
      .filter(Boolean);

    const mergedSymbols = Array.from(
      new Set([...existingSymbols, ...incomingSymbols])
    );

    const payload = {
      symbols: mergedSymbols,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(stocksPath, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('⚠️ Failed to persist refreshed India stocks:', error.message);
  }
}

async function refreshIndiaStocksFromChartink() {
  const url = getConfiguredChartinkScreenerUrls();

  try {
    const result = await scrapeChartinkSymbols(url);
    const symbols = (result.symbols || [])
      .map((symbol) => String(symbol).toUpperCase().trim())
      .filter(Boolean);

    saveIndiaStocks(symbols);
    console.log(`✅ Refreshed India symbols from ${url} (${result.count || 0})`);
    return { symbols, refreshed: true };
  } catch (error) {
    console.error(`⚠️ Failed scraping ${url}:`, error.message || error);
    return { symbols: [], refreshed: false };
  }
}

async function scrapeChartinkTableRows(url) {
  const puppeteer = require('puppeteer');
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (launchError) {
    browser = await puppeteer.launch({
      executablePath:
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    // Ensure the Stocks table is active.
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const stocksButton = buttons.find(
        (button) => button.textContent && button.textContent.trim() === 'Stocks'
      );

      if (stocksButton) {
        stocksButton.click();
      }
    });

    await page.waitForSelector('table tbody tr td[data-field="nsecode"] a', {
      timeout: 30000,
    });

    const collectVisibleRows = async () => {
      const rows = await page.evaluate(() => {
        const parseCloseValue = (raw) => {
          if (!raw) return null;
          const normalized = raw.replace(/,/g, '').trim();
          const value = Number(normalized);
          return Number.isFinite(value) ? value : null;
        };

        const visibleRows = Array.from(document.querySelectorAll('table tbody tr'))
          .map((tr) => {
            const symbol =
              tr
                .querySelector('td[data-field="nsecode"] a')
                ?.textContent?.trim()
                ?.toUpperCase() || '';

            const closeText =
              tr
                .querySelector('td[data-field="scan-column-default-close"] span')
                ?.textContent?.trim() || '';

            const close = parseCloseValue(closeText);
            return { symbol, close };
          })
          .filter((row) => row.symbol && row.close !== null);

        const scroller = document.querySelector('.cluster-table .relative.overflow-y-auto');
        const scrollTop = scroller ? scroller.scrollTop : 0;
        const clientHeight = scroller ? scroller.clientHeight : 0;
        const scrollHeight = scroller ? scroller.scrollHeight : 0;

        if (scroller) {
          scroller.scrollTop = Math.min(scrollTop + Math.max(clientHeight, 24), scrollHeight);
        }

        const atBottom = !scroller || scrollTop + clientHeight >= scrollHeight - 2;

        return {
          visibleRows,
          atBottom,
        };
      });

      return rows;
    };

    const rowsBySymbol = new Map();
    let stablePasses = 0;

    for (let pass = 0; pass < 120; pass++) {
      const snapshot = await collectVisibleRows();
      let addedThisPass = 0;

      snapshot.visibleRows.forEach((row) => {
        if (!rowsBySymbol.has(row.symbol)) {
          addedThisPass += 1;
        }
        rowsBySymbol.set(row.symbol, row);
      });

      if (addedThisPass === 0) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
      }

      if (snapshot.atBottom && stablePasses >= 3) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const rows = Array.from(rowsBySymbol.values());
    if (rows.length > 0) {
      return rows;
    }

    // Fallback: single snapshot if virtualization selector changed.
    const fallbackRows = await page.evaluate(() => {
      const parseCloseValue = (raw) => {
        if (!raw) return null;
        const normalized = raw.replace(/,/g, '').trim();
        const value = Number(normalized);
        return Number.isFinite(value) ? value : null;
      };

      return Array.from(document.querySelectorAll('table tbody tr'))
        .map((tr) => {
          const symbol =
            tr
              .querySelector('td[data-field="nsecode"] a')
              ?.textContent?.trim()
              ?.toUpperCase() || '';

          const closeText =
            tr
              .querySelector('td[data-field="scan-column-default-close"] span')
              ?.textContent?.trim() || '';

          const close = parseCloseValue(closeText);
          return { symbol, close };
        })
        .filter((row) => row.symbol && row.close !== null);
    });

    return fallbackRows;
  } finally {
    await browser.close();
  }
}

// ============= HELPER FUNCTIONS =============

async function getIndianStockPrice(symbol) {
  try {
    if (typeof fetch === 'undefined') {
      global.fetch = require('node-fetch');
    }

    // Use Yahoo Finance API with .NS suffix for NSE listings
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (result?.meta?.regularMarketPrice) {
      return result.meta.regularMarketPrice;
    }

    return null;
  } catch (error) {
    return null;
  }
}

function getIndianStockDetails(price, symbol) {
  /**
   * Indian stock criteria for "fire" signals:
   * - Price under ₹50 (affordable)
   * - High liquidity (inferred from NSE listing)
   * - Institutional watchlist member
   * Score: 1-5
   */

  if (!price) return { fireLevel: 0, reason: 'No price data' };

  if (price < 10) {
    return { fireLevel: 5, reason: 'Ultra-affordable (<₹10)' };
  } else if (price < 25) {
    return { fireLevel: 4, reason: 'Very affordable (<₹25)' };
  } else if (price < 50) {
    return { fireLevel: 3, reason: 'Affordable (<₹50)' };
  } else if (price < 100) {
    return { fireLevel: 2, reason: 'Moderate (<₹100)' };
  }

  return { fireLevel: 0, reason: `High price (₹${price.toFixed(2)})` };
}

async function sendTelegramMessage(message) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('❌ Token env not configured. Set PW_NOTIFY_KEY (preferred) or TELEGRAM_BOT_TOKEN.');
      return false;
    }

    if (!TELEGRAM_CHAT_ID) {
      console.error('❌ Telegram chat ID not found in settings.json');
      return false;
    }

    const chatIds = String(TELEGRAM_CHAT_ID)
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (chatIds.length === 0) {
      console.error('❌ No valid Telegram chat IDs found in settings.json');
      return false;
    }

    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const results = await Promise.all(
      chatIds.map(async (chatId) => {
        try {
          console.log(`📡 Sending to Telegram group/chat: ${chatId}...`);
          await axios.post(`${baseUrl}/sendMessage`, {
            chat_id: chatId,
            text: message
          });
          console.log(`✅ Telegram message sent to ${chatId}`);
          return { chatId, success: true };
        } catch (sendError) {
          const telegramError = sendError.response?.data;
          const description = telegramError?.description || sendError.message;

          if (telegramError?.error_code === 403 && description?.includes("can't initiate conversation")) {
            console.error(`❌ Telegram 403 for ${chatId}: bot cannot initiate conversation.`);
            console.error('   Add bot to the group and send a message in that group first.');
          } else {
            console.error(`❌ Failed to send Telegram to ${chatId}:`, telegramError || sendError.message);
          }
          return { chatId, success: false };
        }
      })
    );

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;
    console.log(`📬 Telegram delivery summary: sent=${sent}, failed=${failed}`);
    return sent > 0;
  } catch (error) {
    console.error('❌ Failed to send Telegram:', error.message);
    return false;
  }
}

// ============= MAIN EXECUTION =============

async function runMiniScanAlertIndia() {
  console.log('\n🚀 Starting Indian Stock Mini Scan Alert...');
  console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

  const screenerUrl = getConfiguredChartinkScreenerUrls();
  let tableRows = [];

  try {
    tableRows = await scrapeChartinkTableRows(screenerUrl);

    if (tableRows.length > 0) {
      const symbolsFromTable = tableRows.map((row) => row.symbol);
      INDIA_STOCKS = symbolsFromTable;
      saveIndiaStocks(symbolsFromTable);
      console.log(`✅ Refreshed India symbols from ${screenerUrl} (${symbolsFromTable.length})`);
      console.log(`📥 Loaded ${INDIA_STOCKS.length} symbols from Chartink Stocks table.`);
    } else {
      const refreshed = await refreshIndiaStocksFromChartink();
      if (refreshed.refreshed && refreshed.symbols.length > 0) {
        INDIA_STOCKS = refreshed.symbols;
        console.log(`📥 Loaded ${INDIA_STOCKS.length} symbols from Chartink screener.`);
      }
    }
  } catch (error) {
    console.error('⚠️ Failed reading Chartink Stocks table:', error.message || error);

    try {
      const refreshed = await refreshIndiaStocksFromChartink();
      if (refreshed.refreshed && refreshed.symbols.length > 0) {
        INDIA_STOCKS = refreshed.symbols;
        console.log(`📥 Loaded ${INDIA_STOCKS.length} symbols from Chartink screener.`);
      }
    } catch (fallbackError) {
      console.error('⚠️ Fallback screener refresh failed:', fallbackError.message || fallbackError);
    }
  }

  if (INDIA_STOCKS.length === 0) {
    console.log('⚠️ No Indian stocks loaded from indiaStocks.json');
    return;
  }

  if (tableRows.length > 0) {
    console.log(`📋 Pulled ${tableRows.length} rows from Chartink Stocks table.`);
  }

  if (tableRows.length > 0) {
    console.log(`📊 Scanning ${tableRows.length} Indian stocks from table values...\n`);
  } else {
    console.log(`📊 Scanning ${INDIA_STOCKS.length} Indian stocks...\n`);
  }

  const analyzed = [];
  const scannedLines = [];

  const rowsToScan =
    tableRows.length > 0
      ? tableRows
      : INDIA_STOCKS.map((symbol) => ({ symbol, close: null }));

  for (let i = 0; i < rowsToScan.length; i++) {
    const row = rowsToScan[i];
    const symbol = row.symbol;
    process.stdout.write(`[${i + 1}/${rowsToScan.length}] ${symbol}...`);

    try {
      const price = row.close !== null ? row.close : await getIndianStockPrice(symbol);
      if (!price) {
        console.log(' (no price)');
        scannedLines.push(`[${i + 1}/${rowsToScan.length}] ${symbol}... (no price)`);
        continue;
      }

      console.log(` ₹${price.toFixed(2)}`);

      analyzed.push({
        symbol,
        price
      });

      scannedLines.push(
        `[${i + 1}/${rowsToScan.length}] ${symbol}... ₹${price.toFixed(2)}\n${buildChartinkStockUrl(symbol)}`
      );

      // Rate limiting only when live prices are fetched one-by-one.
      if (row.close === null) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(' (error)');
    }
  }

  console.log(`\n✨ Analysis Complete!`);
  console.log(`📊 Analyzed: ${analyzed.length}`);

  if (scannedLines.length === 0) {
    console.log('ℹ️ No scanned values available to send.');
    return;
  }

  let message = '📊 Indian Stock Mini Scan Alert\n\n';
  message += `${scannedLines.length} scanned values:\n\n`;
  message += scannedLines.join('\n');
  message += `\n\n⏰ Scan: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  await sendTelegramMessage(message);
}

runMiniScanAlertIndia().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
