import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { 
  Layers,
  Sparkles,
  Play,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
  Target,
  AlertTriangle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

const StrategyPanel = ({ strategies, onCreateAIStrategy, onRunScanner, isScanning, onRefresh }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStrategies, setSelectedStrategies] = useState([]);

  const getStrategyIcon = (type) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'reversal': return TrendingDown;
      case 'breakout': return Zap;
      case 'meme_short': return AlertTriangle;
      default: return Target;
    }
  };

  const getStrategyColor = (type) => {
    switch (type) {
      case 'trend': return '#00E599';
      case 'reversal': return '#FFD60A';
      case 'breakout': return '#00D4FF';
      case 'meme_short': return '#FF3B30';
      default: return '#8B5CF6';
    }
  };

  const handleCreateStrategy = async () => {
    if (!aiPrompt.trim()) return;
    setIsCreating(true);
    try {
      await onCreateAIStrategy(aiPrompt);
      setAiPrompt('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating strategy:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleStrategySelection = (strategyId) => {
    setSelectedStrategies(prev => 
      prev.includes(strategyId) 
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  const handleRunScanner = () => {
    onRunScanner(selectedStrategies.length > 0 ? selectedStrategies : null);
  };

  const activeStrategies = strategies.filter(s => s.is_active);

  return (
    <TooltipProvider>
      <div className="h-full rounded-xl border border-border/40 bg-card flex flex-col overflow-hidden" data-testid="strategy-panel">
        {/* Header - Compact */}
        <div className="p-2 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-heading text-sm font-bold text-foreground truncate">Strategies</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh} className="h-6 w-6 flex-shrink-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Action Buttons - Stack vertically when narrow */}
          <div className="flex flex-col gap-1">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full h-7 text-[10px]">
                  <Sparkles className="w-3 h-3 mr-1 flex-shrink-0" />
                  AI Builder
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">AI Strategy Builder</DialogTitle>
                  <DialogDescription className="text-sm">
                    Describe your strategy in plain English. AI (GPT-4o) will convert it to rules.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Textarea
                    placeholder="Example: Short meme coins that pumped 25% in the last hour with declining volume..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-32 bg-background border-border"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateStrategy} disabled={!aiPrompt.trim() || isCreating} className="bg-primary">
                    {isCreating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleRunScanner}
              disabled={isScanning || activeStrategies.length === 0}
              className="w-full h-7 text-[10px] bg-primary text-primary-foreground"
            >
              {isScanning ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Scanning...</> : <><Play className="w-3 h-3 mr-1" /> Scan Market</>}
            </Button>
          </div>
        </div>

        {/* Strategy List - Responsive cards */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-1.5 space-y-1">
            {strategies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No strategies</p>
              </div>
            ) : (
              strategies.map((strategy) => {
                const Icon = getStrategyIcon(strategy.type);
                const color = getStrategyColor(strategy.type);
                const isSelected = selectedStrategies.includes(strategy.id);
                
                return (
                  <Tooltip key={strategy.id}>
                    <TooltipTrigger asChild>
                      <Card
                        className={`p-2 cursor-pointer transition-all hover:bg-accent/50 ${
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                        } ${strategy.is_active ? '' : 'opacity-40'}`}
                        onClick={() => toggleStrategySelection(strategy.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: color + '20' }}
                          >
                            <Icon className="w-3 h-3" style={{ color }} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-mono font-semibold text-[11px] text-foreground truncate">
                                {strategy.name}
                              </p>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge 
                                variant="secondary" 
                                className="text-[8px] px-1 py-0 capitalize h-4"
                                style={{ backgroundColor: color + '15', color }}
                              >
                                {strategy.type.replace('_', ' ')}
                              </Badge>
                              {strategy.is_builtin && (
                                <span className="text-[8px] text-muted-foreground">Built-in</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[250px]">
                      <p className="font-semibold text-sm">{strategy.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{strategy.description}</p>
                      <div className="flex gap-2 mt-2 text-[10px]">
                        <span>Risk: {strategy.risk_params?.risk_percent || 2}%</span>
                        <span>R:R {strategy.risk_params?.rr_ratio || 2}:1</span>
                        <span>{strategy.timeframes?.join('/')}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-border/40 flex-shrink-0">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>{activeStrategies.length} active</span>
            <span>{selectedStrategies.length} selected</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default StrategyPanel;
