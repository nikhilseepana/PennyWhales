# Stock Scanner Dashboard

A professional stock scanning application with React frontend and Node.js backend that analyzes BlackRock and Vanguard holdings using **pure JavaScript** - no Python required!

## Features

- 🎯 **Smart Stock Scanning**: Analyzes stocks for BlackRock & Vanguard holdings above 3%
- 🔥 **Priority Tiers**: High/Medium/Low priority with fire indicators for premium deals
- 📊 **Interactive Dashboard**: Click tickers to open TradingView charts
- 🆕 **Smart Tracking**: Only shows new qualifying stocks on subsequent scans
- ⚡ **Real-time Updates**: Live scanning progress and results
- 💰 **Price Filtering**: Configurable price thresholds (default: under $2.00)
- 🚀 **Pure JavaScript**: No Python dependencies - just Node.js API calls

## Quick Start

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Start Development Servers**
   ```bash
   npm run dev
   ```
   - API Server: http://localhost:3001
   - React App: http://localhost:3000

3. **Start Scanning**
   - Click "Start New Scan" in the dashboard
   - Watch real-time progress
   - Click stock tickers to view TradingView charts

## Project Structure

```
├── web/                 # React Frontend
│   ├── src/
│   │   ├── StockDashboard.tsx
│   │   ├── types.ts
│   │   ├── api.ts
│   │   └── index.css
│   └── package.json
├── api/                 # Node.js Backend
│   ├── server.js        # Express API server
│   ├── stockScanner.js  # Pure JavaScript scanner
│   ├── tickers.txt      # Stock tickers to scan
│   └── package.json
├── tickers.txt            # Stock tickers to scan (legacy location)
├── scan_results.json      # Latest scan results
└── processed_stocks.json  # Tracking database
```

## How It Works

The scanner makes direct API calls to:
- **Yahoo Finance**: For real-time stock prices
- **Nasdaq API**: For institutional holdings data

All processing is done in pure JavaScript - no external dependencies!

## Configuration

### Scanner Settings (`api/stockScanner.js`)
- `PRICE_THRESHOLD = 2.0`: Maximum stock price
- `HOLD_THRESHOLD = 3.0`: Minimum 3% holding requirement  
- `REQUIRE_BOTH_HOLDERS = false`: BR OR VG vs BR AND VG
- `DELAY_BETWEEN_REQUESTS = 500`: Rate limiting (ms)

### Ticker List (`api/tickers.txt`)
Add your tickers in either format:
```
# Comma-separated
AAPL,MSFT,GOOGL,TSLA

# Line-separated
AAPL
MSFT
GOOGL
TSLA
```

## Stock Priority Tiers

### 🔥 HIGH PRIORITY
- Both BlackRock AND Vanguard have 4%+ holdings
- 🔥🔥🔥🔥🔥 Premium: Both 5%+ under $1.00
- 🔥🔥🔥 Super: Both 5%+ any price
- 🔥 Standard: Both 4%+ any price

### 📊 MEDIUM PRIORITY  
- One holder has 3%+ AND other exists (>0%)

### ⚠️ LOW PRIORITY
- Single holder or below criteria

## API Endpoints

- `POST /api/scan/start` - Start new scan
- `GET /api/scan/status` - Get scan progress
- `GET /api/scan/results` - Get latest results
- `GET /api/processed-stocks` - Get tracking info
- `POST /api/processed-stocks/reset` - Reset tracking
- `GET /api/health` - Health check

## Smart Tracking System

The app maintains a database of previously scanned stocks:
- **First run**: Scans all tickers
- **Subsequent runs**: Only shows NEW qualifying stocks
- **Reset tracking**: Use API endpoint or delete `processed_stocks.json`

## Development Commands

```bash
# Install all dependencies
npm run install-all

# Development mode (both servers)
npm run dev

# Production mode
npm run start

# Build React app
npm run build

# Run individual servers
npm run dev-api    # API only
npm run dev-web    # React only

# Test scanner manually
npm run test-scanner
```

## Mobile App

The React Native app in `mobile/` is GitHub-only for data.

- It does not call your Node API server.
- It reads the workflow-generated JSON files directly from `api/data/` on GitHub.
- As long as your GitHub Actions keep updating those JSON files, the mobile app stays in sync without any backend server.
- `npm run mobile-ios` and `npm run mobile-android` only need Metro for bundling during development; they do not require the API process.

Current mobile data source:

```text
https://raw.githubusercontent.com/nikhilseepana/PennyWhales/main/api/data
```

## Requirements

- **Node.js 16+** (that's it!)
- No Python required
- No external API keys needed

## Installation

```bash
# Clone and install
git clone <your-repo>
cd stock-scanner-project
npm run install-all

# Start development
npm run dev
```

## Advantages of Pure JavaScript

✅ **No Python Dependencies**: Just Node.js  
✅ **Faster Startup**: No subprocess spawning  
✅ **Better Error Handling**: Native JavaScript errors  
✅ **Simpler Deployment**: Single runtime environment  
✅ **Real-time Progress**: Direct progress callbacks  
✅ **Better Integration**: Native async/await

## Troubleshooting

1. **API connection issues**: Ensure API server running on port 3001
2. **No results**: Verify tickers.txt has valid symbols
3. **Rate limiting**: Nasdaq may block rapid requests - increase delay
4. **Reset tracking**: Delete `processed_stocks.json` to scan all stocks again

## Migration from Python

The original Python scanner (`scanner_pro_enhanced.py`) is still available for reference, but the new JavaScript implementation provides the same functionality with:
- Better performance
- Simpler deployment  
- Real-time progress updates
- No external dependencies

## License

ISC