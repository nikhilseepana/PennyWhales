const axios = require('axios');
const cheerio = require('cheerio');

function isValidSymbol(symbol) {
  return /^[A-Z0-9.-]{2,15}$/.test(symbol);
}

function normalizeSymbols(items) {
  const symbols = new Set();
  const excludedTokens = new Set([
    'STOCK',
    'STOCKS',
    'SYMBOL',
    'SR',
    'SR.',
    'SR.STOCK',
    'NAME',
    'CLOSE',
    'VOLUME',
    'CHANGE',
  ]);

  for (const item of items) {
    const symbol = String(item || '').trim().toUpperCase();
    if (isValidSymbol(symbol) && !excludedTokens.has(symbol)) {
      symbols.add(symbol);
    }
  }
  return Array.from(symbols);
}

async function scrapeWithStaticHtml(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
    },
    timeout: 20000,
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const directSymbols = [];
  $('.backtest-timeline-symbol-text').each((_, el) => {
    directSymbols.push($(el).text());
  });

  if (directSymbols.length > 0) {
    return normalizeSymbols(directSymbols);
  }

  const cellSymbols = [];
  $('td.backtest-timeline-symbol-cell button').each((_, el) => {
    cellSymbols.push($(el).text());
  });

  return normalizeSymbols(cellSymbols);
}

async function scrapeWithRenderedPage(url) {
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

    // Chartink renders stocks only after selecting the "Stocks" view.
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const stocksButton = buttons.find(
        (button) => button.textContent && button.textContent.trim() === 'Stocks'
      );

      if (stocksButton) {
        stocksButton.click();
      }
    });

    await page.waitForSelector(
      'button.backtest-timeline-symbol-text, td.backtest-timeline-symbol-cell button, td a[href*="symbol="]',
      {
        timeout: 30000,
      }
    );

    let collectedSymbols = [];

    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await page.evaluate(() => {
        const matchedText = document.body.innerText || '';
        const matched = matchedText.match(/Matched\s+(\d+)\s+stocks/i);
        const matchedCount = matched ? Number(matched[1]) : null;

        const fromTimelineButtons = Array.from(
          document.querySelectorAll('button.backtest-timeline-symbol-text')
        ).map((el) => (el.textContent || '').trim());

        const fromTimelineCells = Array.from(
          document.querySelectorAll('td.backtest-timeline-symbol-cell button')
        ).map((el) => (el.textContent || '').trim());

        const fromScanTable = Array.from(
          document.querySelectorAll('td a[href*="symbol="]')
        ).map((el) => (el.textContent || '').trim());

        const fromTimelineRows = Array.from(
          document.querySelectorAll('table tr')
        )
          .map((row) => (row.textContent || '').trim())
          .map((text) => {
            const token = text.split(/\s+/)[0] || '';
            return token.trim();
          });

        return {
          matchedCount,
          rawSymbols: [
            ...fromTimelineButtons,
            ...fromTimelineCells,
            ...fromScanTable,
            ...fromTimelineRows,
          ],
        };
      });

      collectedSymbols = normalizeSymbols(snapshot.rawSymbols);

      if (
        snapshot.matchedCount &&
        collectedSymbols.length >= snapshot.matchedCount
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return collectedSymbols;
  } finally {
    await browser.close();
  }
}

/**
 * Scrape Chartink screener page and extract NSE symbols from timeline rows.
 * The primary target is the symbol button text (e.g. ZEEL) inside
 * .backtest-timeline-symbol-text elements.
 *
 * @param {string} url
 * @returns {Promise<{symbols: string[], count: number, sourceUrl: string, scrapedAt: string}>}
 */
async function scrapeChartinkSymbols(url = process.env.CHARTINK_SCREENER_URL) {
  if (!url) {
    throw new Error('CHARTINK_SCREENER_URL is not configured');
  }

  let symbols = await scrapeWithStaticHtml(url);
  let scrapeMode = 'static';

  if (symbols.length === 0) {
    symbols = await scrapeWithRenderedPage(url);
    scrapeMode = 'rendered';
  }

  return {
    symbols,
    count: symbols.length,
    sourceUrl: url,
    scrapeMode,
    scrapedAt: new Date().toISOString(),
  };
}

module.exports = {
  scrapeChartinkSymbols,
};
