import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

const SignalsPanel = ({ signals, isLoading, currentCoin, title = "AI Signals" }) => {
  const getSignalConfig = (type, confidence) => {
    const configs = {
      BUY: {
        icon: TrendingUp,
        color: '#00E599',
        bgClass: 'signal-card-buy',
        label: 'BUY'
      },
      LONG: {
        icon: TrendingUp,
        color: '#00E599',
        bgClass: 'signal-card-buy',
        label: 'LONG'
      },
      SELL: {
        icon: TrendingDown,
        color: '#FF3B30',
        bgClass: 'signal-card-sell',
        label: 'SELL'
      },
      SHORT: {
        icon: TrendingDown,
        color: '#FF3B30',
        bgClass: 'signal-card-sell',
        label: 'SHORT'
      },
      HOLD: {
        icon: Minus,
        color: '#FFD60A',
        bgClass: 'signal-card-hold',
        label: 'HOLD'
      }
    };

    const confidenceColors = {
      HIGH: { color: '#00E599', label: 'High Confidence' },
      MEDIUM: { color: '#FFD60A', label: 'Medium Confidence' },
      LOW: { color: '#FF3B30', label: 'Low Confidence' }
    };

    return {
      ...configs[type] || configs.HOLD,
      confidence: confidenceColors[confidence] || confidenceColors.MEDIUM
    };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price) => {
    if (!price) return '$0';
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  if (isLoading) {
    return (
      <div 
        className="h-full rounded-xl border border-border/40 bg-card p-3"
        data-testid="signals-panel-loading"
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-bold">{title}</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full rounded-xl border border-border/40 bg-card flex flex-col"
      data-testid="signals-panel"
    >
      {/* Header */}
      <div className="p-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {signals.length} signals
          </Badge>
        </div>
      </div>

      {/* Signals List */}
      <ScrollArea className="flex-1">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-3">
            <Zap className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No signals yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Generate AI Signal" to analyze
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
                  className={`p-3 ${config.bgClass} hover:bg-card/80 transition-all cursor-pointer animate-slide-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`signal-card-${index}`}
                >
                  {/* Signal Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm" style={{ color: config.color }}>
                          {config.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {signal.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className="text-[10px] font-mono"
                        style={{ 
                          borderColor: config.confidence.color,
                          color: config.confidence.color
                        }}
                      >
                        {signal.confidence_score ? `${signal.confidence_score}%` : signal.confidence}
                      </Badge>
                    </div>
                  </div>

                  {/* Price Levels */}
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Entry</p>
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {formatPrice(signal.entry_price)}
                      </p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <Target className="w-2.5 h-2.5 text-[#00E599]" />
                        <p className="text-[10px] text-muted-foreground">TP</p>
                      </div>
                      <p className="font-mono text-xs font-semibold text-[#00E599]">
                        {formatPrice(signal.take_profit)}
                      </p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <Shield className="w-2.5 h-2.5 text-[#FF3B30]" />
                        <p className="text-[10px] text-muted-foreground">SL</p>
                      </div>
                      <p className="font-mono text-xs font-semibold text-[#FF3B30]">
                        {formatPrice(signal.stop_loss)}
                      </p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <p className="text-[10px] text-muted-foreground mb-0.5">R:R</p>
                      <p className="font-mono text-xs font-semibold text-primary">
                        {signal.risk_reward?.toFixed(1) || '2.0'}
                      </p>
                    </div>
                  </div>

                  {/* Analysis */}
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                    {signal.analysis}
                  </p>

                  {/* Reasoning Points */}
                  {signal.reasoning && signal.reasoning.length > 0 && (
                    <div className="space-y-0.5 mb-2">
                      {signal.reasoning.slice(0, 2).map((reason, i) => (
                        <div key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {signal.warnings && signal.warnings.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-[#FFD60A] mb-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{signal.warnings[0]}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{formatTime(signal.timestamp)}</span>
                    </div>
                    <span className="font-mono">{signal.indicators?.timeframe || signal.timeframe || '1H'}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default SignalsPanel;
