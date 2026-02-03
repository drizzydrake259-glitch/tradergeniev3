import React from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

const Header = ({ currentCoin, intelligence }) => {
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const marketCapChange = intelligence?.global?.market_cap_change_24h || 0;
  const isPositive = marketCapChange >= 0;

  return (
    <header 
      className="h-16 border-b border-border/40 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-50"
      data-testid="header"
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            TraderGenie
          </h1>
          <p className="text-xs text-muted-foreground font-mono">AI Strategy Engine</p>
        </div>
      </div>

      {/* Market Stats - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-8">
        {/* Total Market Cap */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Market Cap</p>
          <p className="font-mono text-sm font-medium text-foreground">
            {formatNumber(intelligence?.global?.total_market_cap)}
          </p>
        </div>

        {/* 24h Change */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground">24h Change</p>
          <p className={`font-mono text-sm font-medium flex items-center justify-end gap-1 ${isPositive ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {marketCapChange.toFixed(2)}%
          </p>
        </div>

        {/* BTC Dominance */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground">BTC Dominance</p>
          <p className="font-mono text-sm font-medium text-foreground">
            {(intelligence?.global?.btc_dominance || 0).toFixed(1)}%
          </p>
        </div>

        {/* Current Asset Price */}
        {currentCoin && (
          <div className="text-right pl-4 border-l border-border/40">
            <p className="text-xs text-muted-foreground">{currentCoin.symbol}</p>
            <p className="font-mono text-lg font-bold text-primary">
              ${currentCoin.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Mobile: Just show current price */}
      {currentCoin && (
        <div className="md:hidden text-right">
          <p className="text-xs text-muted-foreground">{currentCoin.symbol}</p>
          <p className="font-mono text-lg font-bold text-primary">
            ${currentCoin.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </header>
  );
};

export default Header;
