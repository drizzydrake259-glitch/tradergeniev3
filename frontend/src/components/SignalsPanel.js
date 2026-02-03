import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const SignalsPanel = ({ signals = [], isLoading, currentCoin, title = "AI Signals", onRefresh }) => {
  // Filter signals to show only for current coin
  const filteredSignals = currentCoin 
    ? signals.filter(s => 
        s.coin_id === currentCoin.id || 
        s.symbol?.toUpperCase() === currentCoin.symbol?.toUpperCase()
      )
    : signals;

  if (isLoading) {
    return (
      <div className="h-full rounded-xl border border-border/40 bg-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-bold">{title}</h3>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    if (!price) return '$0';
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full rounded-xl border border-border/40 bg-card flex flex-col">
      <div className="p-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-base font-bold text-foreground">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {currentCoin && (
              <Badge variant="outline" className="font-mono text-[10px]">{currentCoin.symbol}</Badge>
            )}
            <Badge variant="outline" className="font-mono text-[10px]">{filteredSignals.length}</Badge>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} className="h-6 w-6">
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">% = Confidence (conditions matched)</p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-3">
            <Zap className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No signals for {currentCoin?.symbol || 'this coin'}</p>
            <p className="text-xs text-muted-foreground mt-1">Click "AI Signal" to analyze</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredSignals.map((signal, idx) => {
              const isBuy = signal.signal_type === 'BUY' || signal.signal_type === 'LONG';
              const isSell = signal.signal_type === 'SELL' || signal.signal_type === 'SHORT';
              const color = isBuy ? '#00E599' : isSell ? '#FF3B30' : '#FFD60A';
              const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
              const confColor = signal.confidence === 'HIGH' ? '#00E599' : signal.confidence === 'LOW' ? '#FF3B30' : '#FFD60A';

              return (
                <Card key={signal.id || idx} className="p-3" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm" style={{ color }}>{signal.signal_type}</p>
                        <p className="text-xs text-muted-foreground">{signal.symbol}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono" style={{ borderColor: confColor, color: confColor }}>
                      {signal.confidence_score ? `${signal.confidence_score}%` : signal.confidence}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-1 mb-2">
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <p className="text-[9px] text-muted-foreground">Entry</p>
                      <p className="font-mono text-xs font-semibold">{formatPrice(signal.entry_price)}</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <div className="flex items-center justify-center gap-0.5">
                        <Target className="w-2.5 h-2.5 text-[#00E599]" />
                        <p className="text-[9px] text-muted-foreground">TP</p>
                      </div>
                      <p className="font-mono text-xs font-semibold text-[#00E599]">{formatPrice(signal.take_profit)}</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <div className="flex items-center justify-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 text-[#FF3B30]" />
                        <p className="text-[9px] text-muted-foreground">SL</p>
                      </div>
                      <p className="font-mono text-xs font-semibold text-[#FF3B30]">{formatPrice(signal.stop_loss)}</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-background/50">
                      <p className="text-[9px] text-muted-foreground">R:R</p>
                      <p className="font-mono text-xs font-semibold text-primary">{signal.risk_reward?.toFixed(1) || '2.0'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">{signal.analysis}</p>

                  {signal.warnings && signal.warnings.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[#FFD60A] mb-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{signal.warnings[0]}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{formatTime(signal.timestamp)}</span>
                    </div>
                    <span className="font-mono">1H</span>
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
