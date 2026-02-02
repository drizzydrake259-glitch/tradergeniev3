import React, { useMemo } from 'react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const ChartSection = ({ selectedCoin, timeframe, coinData, isLoading }) => {
  // Create unique key to force remount when coin/timeframe changes
  const widgetKey = useMemo(() => 
    `${selectedCoin.symbol}-${timeframe}-${Date.now()}`,
    [selectedCoin.symbol, timeframe]
  );

  const priceChange = coinData?.price_change_percentage_24h || 0;
  const isPositive = priceChange >= 0;

  return (
    <div 
      className="h-full rounded-xl border border-border/40 bg-card overflow-hidden relative"
      data-testid="chart-section"
    >
      {/* Chart Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-card via-card/90 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {selectedCoin.symbol}/USDT
              </h2>
              <p className="text-sm text-muted-foreground">{selectedCoin.name}</p>
            </div>
            
            {coinData && (
              <div className="flex items-center gap-6 ml-4">
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-mono text-xl font-bold text-foreground">
                    ${coinData.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">24h Change</p>
                  <p className={`font-mono text-lg font-semibold flex items-center gap-1 ${isPositive ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {priceChange.toFixed(2)}%
                  </p>
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs text-muted-foreground">24h High</p>
                  <p className="font-mono text-sm text-foreground">
                    ${coinData.high_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs text-muted-foreground">24h Low</p>
                  <p className="font-mono text-sm text-foreground">
                    ${coinData.low_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="hidden xl:block">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-mono text-sm text-foreground">
                    ${(coinData.total_volume / 1e9).toFixed(2)}B
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-xs font-mono text-muted-foreground">LIVE</span>
          </div>
        </div>
      </div>

      {/* TradingView Widget using iframe */}
      <div className="h-full w-full pt-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <TradingViewWidget 
            key={widgetKey}
            symbol={selectedCoin.symbol} 
            interval={timeframe} 
          />
        )}
      </div>
    </div>
  );
};

// Separate component for the widget to isolate DOM manipulation
const TradingViewWidget = ({ symbol, interval }) => {
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
      hide_volume: false,
      support_host: "https://www.tradingview.com",
      studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"]
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: #050505; }
            .tradingview-widget-container { height: 100vh; width: 100%; }
          </style>
        </head>
        <body>
          <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
            <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
              ${JSON.stringify(config)}
            </script>
          </div>
        </body>
      </html>
    `;
  }, [symbol, interval]);

  return (
    <iframe
      title="TradingView Chart"
      srcDoc={widgetHtml}
      style={{ 
        width: '100%', 
        height: '100%', 
        border: 'none',
        backgroundColor: '#050505'
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default ChartSection;
