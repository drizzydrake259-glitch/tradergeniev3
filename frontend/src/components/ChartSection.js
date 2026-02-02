import React, { useEffect, useRef, memo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const ChartSection = memo(({ selectedCoin, timeframe, coinData, isLoading }) => {
  const containerRef = useRef(null);
  const scriptRef = useRef(null);
  const [widgetReady, setWidgetReady] = useState(false);

  useEffect(() => {
    // Skip if container not ready
    if (!containerRef.current) return;

    // Clean up previous widget
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    setWidgetReady(false);

    // Create wrapper div
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container__widget';
    widgetWrapper.style.height = '100%';
    widgetWrapper.style.width = '100%';
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${selectedCoin.symbol}USDT`,
      interval: timeframe,
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
      studies: [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies"
      ]
    });

    script.onload = () => {
      setWidgetReady(true);
    };

    scriptRef.current = script;

    // Append to container
    container.appendChild(widgetWrapper);
    container.appendChild(script);

    // Cleanup function
    return () => {
      if (container) {
        try {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, [selectedCoin.symbol, timeframe]);

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

      {/* TradingView Widget */}
      <div 
        ref={containerRef} 
        className="tradingview-widget-container h-full w-full pt-20"
      >
        {isLoading && !widgetReady && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
});

ChartSection.displayName = 'ChartSection';

export default ChartSection;
