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
  Zap
} from 'lucide-react';

const SignalsPanel = ({ signals, isLoading, currentCoin }) => {
  const getSignalConfig = (type, confidence) => {
    const configs = {
      BUY: {
        icon: TrendingUp,
        color: '#00E599',
        bgClass: 'signal-card-buy',
        label: 'BUY'
      },
      SELL: {
        icon: TrendingDown,
        color: '#FF3B30',
        bgClass: 'signal-card-sell',
        label: 'SELL'
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

  if (isLoading) {
    return (
      <div 
        className="h-full rounded-xl border border-border/40 bg-card p-4"
        data-testid="signals-panel-loading"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-bold">AI Signals</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
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
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-lg font-bold text-foreground">AI Signals</h3>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {signals.length} signals
          </Badge>
        </div>
      </div>

      {/* Signals List */}
      <ScrollArea className="flex-1 p-4">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Zap className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No signals yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Generate AI Signal" to analyze
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((signal, index) => {
              const config = getSignalConfig(signal.signal_type, signal.confidence);
              const Icon = config.icon;

              return (
                <Card
                  key={signal.id || index}
                  className={`p-4 ${config.bgClass} hover:bg-card/80 transition-all cursor-pointer animate-slide-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`signal-card-${index}`}
                >
                  {/* Signal Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm" style={{ color: config.color }}>
                          {config.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {signal.symbol}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-xs font-mono"
                      style={{ 
                        borderColor: config.confidence.color,
                        color: config.confidence.color
                      }}
                    >
                      {signal.confidence}
                    </Badge>
                  </div>

                  {/* Price Levels */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground mb-1">Entry</p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        ${signal.entry_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Target className="w-3 h-3 text-[#00E599]" />
                        <p className="text-xs text-muted-foreground">TP</p>
                      </div>
                      <p className="font-mono text-sm font-semibold text-[#00E599]">
                        ${signal.take_profit?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Shield className="w-3 h-3 text-[#FF3B30]" />
                        <p className="text-xs text-muted-foreground">SL</p>
                      </div>
                      <p className="font-mono text-sm font-semibold text-[#FF3B30]">
                        ${signal.stop_loss?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Analysis */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {signal.analysis}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{formatTime(signal.timestamp)}</span>
                    </div>
                    <span className="font-mono">{signal.indicators?.timeframe || '1H'}</span>
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
