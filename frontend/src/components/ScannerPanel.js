import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { 
  Radar,
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield,
  AlertTriangle,
  ChevronRight,
  Zap,
  RefreshCw
} from 'lucide-react';

const ScannerPanel = ({ signals, isLoading, onSelectCoin }) => {
  const getSignalConfig = (type, confidence) => {
    const configs = {
      BUY: { icon: TrendingUp, color: '#00E599', label: 'LONG' },
      LONG: { icon: TrendingUp, color: '#00E599', label: 'LONG' },
      SELL: { icon: TrendingDown, color: '#FF3B30', label: 'SELL' },
      SHORT: { icon: TrendingDown, color: '#FF3B30', label: 'SHORT' },
      HOLD: { icon: Target, color: '#FFD60A', label: 'HOLD' }
    };

    const confidenceColors = {
      HIGH: '#00E599',
      MEDIUM: '#FFD60A',
      LOW: '#FF3B30'
    };

    return {
      ...configs[type] || configs.HOLD,
      confidenceColor: confidenceColors[confidence] || confidenceColors.MEDIUM
    };
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatPrice = (price) => {
    if (!price) return '$0';
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  if (isLoading) {
    return (
      <div className="h-full rounded-xl border border-border/40 bg-card p-3" data-testid="scanner-panel-loading">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <h3 className="font-heading text-base font-bold">Scanning...</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Analyzing 100 coins against active strategies</p>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border/40 bg-card flex flex-col" data-testid="scanner-panel">
      {/* Header */}
      <div className="p-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-base font-bold text-foreground">Scanner</h3>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {signals.length} found
          </Badge>
        </div>
      </div>

      {/* Signals List */}
      <ScrollArea className="flex-1 min-h-0">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Radar className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No signals found</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
              Click "Scan" to analyze top 100 coins against your active strategies. Results depend on current market conditions.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {signals.map((signal, index) => {
              const config = getSignalConfig(signal.signal_type, signal.confidence);
              const Icon = config.icon;

              return (
                <Card
                  key={signal.id || index}
                  className="p-2.5 hover:bg-card/80 transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: config.color }}
                  onClick={() => onSelectCoin({ 
                    id: signal.coin_id, 
                    symbol: signal.symbol, 
                    name: signal.name 
                  })}
                  data-testid={`scanner-signal-${index}`}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {signal.image && (
                        <img src={signal.image} alt={signal.symbol} className="w-5 h-5 rounded-full" />
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {signal.symbol}
                          </span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-[9px] text-muted-foreground line-clamp-1">
                          {signal.strategy_name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Badge 
                        className="font-mono text-[10px] px-1.5"
                        style={{ 
                          backgroundColor: `${config.color}20`, 
                          color: config.color,
                          border: `1px solid ${config.color}40`
                        }}
                      >
                        <Icon className="w-3 h-3 mr-0.5" />
                        {config.label}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="font-mono text-[9px] px-1"
                        style={{ borderColor: config.confidenceColor, color: config.confidenceColor }}
                        title="Confidence Score"
                      >
                        {signal.confidence_score}%
                      </Badge>
                    </div>
                  </div>

                  {/* Price Info - Compact */}
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    <div className="bg-background/50 rounded p-1 text-center">
                      <p className="text-[8px] text-muted-foreground">Entry</p>
                      <p className="font-mono text-[10px] font-semibold text-foreground">
                        {formatPrice(signal.entry_price)}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded p-1 text-center">
                      <p className="text-[8px] text-muted-foreground text-[#00E599]">TP</p>
                      <p className="font-mono text-[10px] font-semibold text-[#00E599]">
                        {formatPrice(signal.take_profit)}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded p-1 text-center">
                      <p className="text-[8px] text-muted-foreground text-[#FF3B30]">SL</p>
                      <p className="font-mono text-[10px] font-semibold text-[#FF3B30]">
                        {formatPrice(signal.stop_loss)}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded p-1 text-center">
                      <p className="text-[8px] text-muted-foreground">R:R</p>
                      <p className="font-mono text-[10px] font-semibold text-primary">
                        {signal.risk_reward?.toFixed(1) || '-'}
                      </p>
                    </div>
                  </div>

                  {/* 24h Change */}
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className={signal.price_change_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'}>
                      24h: {signal.price_change_24h >= 0 ? '+' : ''}{signal.price_change_24h?.toFixed(1)}%
                    </span>
                    <span>Vol: {formatNumber(signal.volume_24h)}</span>
                  </div>

                  {/* Warnings */}
                  {signal.warnings && signal.warnings.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] text-[#FFD60A]">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{signal.warnings[0]}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ScannerPanel;
