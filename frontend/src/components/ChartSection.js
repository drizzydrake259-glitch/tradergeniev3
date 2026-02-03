import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import ChartOverlay from './ChartOverlay';

const INDICATOR_STUDIES = {
  'rsi': 'RSI@tv-basicstudies',
  'macd': 'MACD@tv-basicstudies',
  'ema': 'MAExp@tv-basicstudies',
  'bb': 'BB@tv-basicstudies',
  'volume': 'Volume@tv-basicstudies',
  'vwap': 'VWAP@tv-basicstudies',
  'stoch': 'Stochastic@tv-basicstudies',
  'atr': 'ATR@tv-basicstudies',
};

const ChartSection = ({ selectedCoin, timeframe, coinData, isLoading, activeIndicators = [], smcIndicators = {} }) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 500 });
  const chartContainerRef = useRef(null);
  
  // Track container size
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        setChartDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Map standard indicator IDs to TradingView studies
  const studies = useMemo(() => {
    return activeIndicators
      .map(id => INDICATOR_STUDIES[id])
      .filter(Boolean);
  }, [activeIndicators]);

  // Create unique key
  const widgetKey = useMemo(() => 
    `${selectedCoin.symbol}-${timeframe}-${studies.join('-')}-${Date.now()}`,
    [selectedCoin.symbol, timeframe, studies]
  );

  const priceChange = coinData?.price_change_percentage_24h || 0;
  const isPositive = priceChange >= 0;

  // Get active SMC names
  const activeSMCNames = useMemo(() => {
    const names = [];
    if (smcIndicators.fvg) names.push('FVG');
    if (smcIndicators.breakers) names.push('Breakers');
    if (smcIndicators.liquidity) names.push('Liquidity');
    if (smcIndicators.swings) names.push('Swings');
    if (smcIndicators.pdhl) names.push('PDH/PDL');
    return names;
  }, [smcIndicators]);

  return (
    <div className="h-full rounded-xl border border-border/40 bg-card overflow-hidden relative" ref={chartContainerRef}>
      {/* Chart Header Overlay */}
      <div className="absolute top-0 left-0 right-24 z-20 p-3 bg-gradient-to-b from-card via-card/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto flex-wrap">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold text-foreground truncate">{selectedCoin.symbol}/USDT</h2>
            <p className="text-[10px] text-muted-foreground truncate">{selectedCoin.name}</p>
          </div>
          
          {coinData && (
            <>
              <div>
                <p className="text-[9px] text-muted-foreground">Price</p>
                <p className="font-mono text-base font-bold text-foreground">
                  ${coinData.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div>
                <p className="text-[9px] text-muted-foreground">24h</p>
                <p className={`font-mono text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {priceChange.toFixed(2)}%
                </p>
              </div>
              
              <div className="hidden lg:block">
                <p className="text-[9px] text-muted-foreground">High</p>
                <p className="font-mono text-xs text-foreground">
                  ${coinData.high_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="hidden lg:block">
                <p className="text-[9px] text-muted-foreground">Low</p>
                <p className="font-mono text-xs text-foreground">
                  ${coinData.low_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </>
          )}

          {activeSMCNames.length > 0 && (
            <div className="hidden xl:block">
              <p className="text-[9px] text-muted-foreground">SMC Active</p>
              <p className="font-mono text-[10px] text-primary">{activeSMCNames.join(', ')}</p>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">LIVE</span>
          </div>
        </div>
      </div>

      {/* TradingView Widget */}
      <div className="h-full w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <TradingViewWidget 
            key={widgetKey}
            symbol={selectedCoin.symbol} 
            interval={timeframe}
            studies={studies}
          />
        )}
      </div>
      
      {/* Chart Overlay for SMC & Drawing */}
      <ChartOverlay
        smcIndicators={smcIndicators}
        isDrawingMode={isDrawingMode}
        onToggleDrawing={() => setIsDrawingMode(!isDrawingMode)}
        chartDimensions={chartDimensions}
      />
    </div>
  );
};

const TradingViewWidget = ({ symbol, interval, studies = [] }) => {
  const widgetHtml = useMemo(() => {
    const config = {
      autosize: true,
      symbol: `BINANCE:${symbol}USDT`,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(5, 5, 5, 1)",
      gridColor: "rgba(39, 39, 42, 0.3)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: "https://www.tradingview.com",
      studies: studies,
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650"
    };

    return `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;width:100%;background:#050505;overflow:hidden}.tradingview-widget-container{height:100%;width:100%}.tradingview-widget-container__widget{height:100%!important;width:100%!important}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>${JSON.stringify(config)}</script></div></body></html>`;
  }, [symbol, interval, studies]);

  return (
    <iframe
      title="TradingView Chart"
      srcDoc={widgetHtml}
      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#050505' }}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
};

export default ChartSection;
