import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X
} from 'lucide-react';

const SignalsPanel = ({ signals, isLoading, currentCoin, title }) => {
  const panelTitle = title || "AI Signals";
  const [expandedSignal, setExpandedSignal] = useState(null);
  const [editingSignal, setEditingSignal] = useState(null);
  const [customValues, setCustomValues] = useState({});

  const getSignalColor = (type) => {
    if (type === 'BUY' || type === 'LONG') return '#00E599';
    if (type === 'SELL' || type === 'SHORT') return '#FF3B30';
    return '#FFD60A';
  };

  const getSignalIcon = (type) => {
    if (type === 'BUY' || type === 'LONG') return TrendingUp;
    if (type === 'SELL' || type === 'SHORT') return TrendingDown;
    return Minus;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'HIGH') return '#00E599';
    if (confidence === 'LOW') return '#FF3B30';
    return '#FFD60A';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price) => {
    if (!price) return '$0';
    if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (price >= 1) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return '$' + price.toFixed(6);
  };

  const toggleExpand = (signalId) => {
    if (expandedSignal === signalId) {
      setExpandedSignal(null);
    } else {
      setExpandedSignal(signalId);
    }
  };

  const startEditing = (signal) => {
    setEditingSignal(signal.id);
    setCustomValues({
      entry: signal.entry_price,
      tp: signal.take_profit,
      sl: signal.stop_loss,
      rr: signal.risk_reward || 2.0
    });
  };

  const saveCustomValues = () => {
    setEditingSignal(null);
  };

  const cancelEditing = () => {
    setEditingSignal(null);
    setCustomValues({});
  };

  if (isLoading) {
    return (
      <div className="h-full rounded-xl border border-border/40 bg-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-bold">{panelTitle}</h3>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border/40 bg-card flex flex-col">
      <div className="p-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-base font-bold text-foreground">{panelTitle}</h3>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {signals.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          % = Confidence Score (conditions matched)
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-3">
            <Zap className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No signals yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click AI Signal to analyze</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {signals.map((signal, index) => {
              const signalColor = getSignalColor(signal.signal_type);
              const SignalIcon = getSignalIcon(signal.signal_type);
              const confidenceColor = getConfidenceColor(signal.confidence);
              const isExpanded = expandedSignal === signal.id;
              const isEditing = editingSignal === signal.id;

              return (
                <Card
                  key={signal.id || index}
                  className="p-3 transition-all"
                  style={{ borderLeft: '4px solid ' + signalColor }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: signalColor + '20' }}
                      >
                        <SignalIcon className="w-4 h-4" style={{ color: signalColor }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-sm" style={{ color: signalColor }}>
                          {signal.signal_type}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {signal.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs font-mono px-1.5"
                        style={{ borderColor: confidenceColor, color: confidenceColor }}
                      >
                        {signal.confidence_score ? signal.confidence_score + '%' : signal.confidence}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleExpand(signal.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mb-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Entry</label>
                          <Input
                            type="number"
                            value={customValues.entry || ''}
                            onChange={(e) => setCustomValues({...customValues, entry: parseFloat(e.target.value)})}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">R:R</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={customValues.rr || ''}
                            onChange={(e) => setCustomValues({...customValues, rr: parseFloat(e.target.value)})}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#00E599]">Take Profit</label>
                          <Input
                            type="number"
                            value={customValues.tp || ''}
                            onChange={(e) => setCustomValues({...customValues, tp: parseFloat(e.target.value)})}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#FF3B30]">Stop Loss</label>
                          <Input
                            type="number"
                            value={customValues.sl || ''}
                            onChange={(e) => setCustomValues({...customValues, sl: parseFloat(e.target.value)})}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs flex-1" onClick={saveCustomValues}>
                          <Check className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={cancelEditing}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <p className="text-[9px] text-muted-foreground mb-0.5">Entry</p>
                        <p className="font-mono text-xs font-semibold text-foreground">
                          {formatPrice(signal.entry_price)}
                        </p>
                      </div>
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <Target className="w-2.5 h-2.5 text-[#00E599]" />
                          <p className="text-[9px] text-muted-foreground">TP</p>
                        </div>
                        <p className="font-mono text-xs font-semibold text-[#00E599]">
                          {formatPrice(signal.take_profit)}
                        </p>
                      </div>
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <Shield className="w-2.5 h-2.5 text-[#FF3B30]" />
                          <p className="text-[9px] text-muted-foreground">SL</p>
                        </div>
                        <p className="font-mono text-xs font-semibold text-[#FF3B30]">
                          {formatPrice(signal.stop_loss)}
                        </p>
                      </div>
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <p className="text-[9px] text-muted-foreground mb-0.5">R:R</p>
                        <p className="font-mono text-xs font-semibold text-primary">
                          {signal.risk_reward ? signal.risk_reward.toFixed(1) : '2.0'}
                        </p>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-6 text-xs mb-2"
                      onClick={() => startEditing(signal)}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Customize Entry/TP/SL
                    </Button>
                  )}

                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                    {signal.analysis}
                  </p>

                  {isExpanded && (
                    <div className="space-y-2 border-t border-border/30 pt-2">
                      {signal.reasoning && signal.reasoning.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">Reasoning:</p>
                          {signal.reasoning.map((reason, i) => (
                            <div key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
                              <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {signal.invalidation && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Invalidation: </span>
                          {signal.invalidation}
                        </div>
                      )}
                    </div>
                  )}

                  {signal.warnings && signal.warnings.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[#FFD60A] mb-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>{signal.warnings[0]}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-2">
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
