# TraderGenie - AI Trading Strategy Engine

## Product Overview
TraderGenie is a personal AI trading tool for crypto markets that scans assets, encodes trading strategies, and generates actionable signals with entry/TP/SL levels.

## Core Requirements
- **Strategy Engine**: Define strategies in plain English, AI translates to executable rules. Pre-built strategies (Trend Continuation, Mean Reversion, Breakouts, Meme Coin Pump-Shorts) + custom AI-generated strategies.
- **Market Scanner**: Real-time scanner to monitor crypto assets across timeframes for strategy matches.
- **Signal Generation**: Detailed trade plans with entry, TP, SL, R:R ratio, and AI reasoning. Manual execution only.
- **Dashboard UI**: Single dashboard with strategy library, live scanner, signal feed, and TradingView chart.
- **SMC Indicators**: Data-driven chart indicators for FVG, Breakers, Liquidity, Swings, PDH/PDL.

## Technical Architecture

### Backend (FastAPI)
- `/api/strategies` - CRUD for trading strategies
- `/api/strategies/ai/generate` - AI strategy generation via GPT-4o
- `/api/scanner/scan` - Market scanner with fallback data
- `/api/signals/generate` - AI signal generation
- `/api/market/*` - Market data from CoinGecko
- `/api/intelligence/overview` - Market intelligence with Coinglass derivatives data

### Frontend (React)
- `TradingDashboard.js` - Main dashboard with resizable panels
- `ChartSection.js` - TradingView chart with overlays
- `ChartOverlay.js` - R:R Box drawing tool and SMC indicators
- `TradeCalculator.js` - Position sizing and P/L calculator
- `StrategyPanel.js` - Strategy library with descriptions
- `ScannerPanel.js` - Market scanner results grid
- `SignalsPanel.js` - AI-generated signals
- `MarketIntelligence.js` - Global market data bar

### Database (MongoDB)
- `strategies` - User-created strategies
- `trade_signals` - Generated AI signals
- `scanner_signals` - Scanner results history

## Implemented Features (Feb 3, 2025)

### P0 - Complete
- [x] R:R Box moved above chart with single-click creation
- [x] R:R Box duplicate (copy) feature for easy box cloning
- [x] Market Scanner fixed - uses fallback data when CoinGecko rate limited
- [x] Page scrollable - scanner below news section
- [x] Trade Calculator integrated with live calculations
- [x] Strategy descriptions visible in white text
- [x] SMC indicators functional (FVG, Breakers, Liquidity, Swings, PDH/PDL)
- [x] Coinglass API key moved to environment variable

### Known Limitations
- Scanner uses fallback coin data when CoinGecko API is rate limited (MOCKED)
- Coinglass API returns placeholder data without API key configured

## Upcoming Tasks (P1)
- [ ] Allow users to edit Entry/TP/SL for AI signals
- [ ] Add more technical indicators to dropdown
- [ ] Improve R:R Box interaction (easier resize handles)

## Future/Backlog (P2)
- [ ] Implement backtesting module
- [ ] Volume profile for Liquidity indicator
- [ ] Auto-refresh scanner at configurable intervals
- [ ] Strategy performance tracking

## Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=<key>
COINGLASS_API_KEY=<optional>
```

## Testing
- Backend: `/app/backend/tests/test_tradergenie_api.py` - 16 tests
- Test reports: `/app/test_reports/iteration_1.json`
