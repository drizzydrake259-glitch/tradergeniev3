import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
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
      <div className="h-full rounded-xl border border-border/40 bg-card flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="p-1.5 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 min-w-0">
              <Layers className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="font-heading text-xs font-bold text-foreground truncate">Strategies</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh} className="h-5 w-5 flex-shrink-0">
              <RefreshCw className="h-2.5 w-2.5" />
            </Button>
          </div>
          
          {/* Buttons stacked */}
          <div className="space-y-1">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full h-6 text-[9px] px-1">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  AI Builder
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle>AI Strategy Builder</DialogTitle>
                  <DialogDescription className="text-sm">
                    Describe your strategy in plain English.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Short meme coins that pumped 25% with declining volume..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-32 bg-background border-border"
                />
                <DialogFooter>
                  <Button onClick={handleCreateStrategy} disabled={!aiPrompt.trim() || isCreating}>
                    {isCreating ? 'Creating...' : 'Generate'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              size="sm" 
              onClick={handleRunScanner}
              disabled={isScanning || activeStrategies.length === 0}
              className="w-full h-6 text-[9px] px-1 bg-primary text-primary-foreground"
            >
              {isScanning ? <RefreshCw className="w-2.5 h-2.5 mr-0.5 animate-spin" /> : <Play className="w-2.5 h-2.5 mr-0.5" />}
              {isScanning ? 'Scanning' : 'Scan'}
            </Button>
          </div>
        </div>

        {/* Strategy List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-1 space-y-0.5">
            {strategies.map((strategy) => {
              const Icon = getStrategyIcon(strategy.type);
              const color = getStrategyColor(strategy.type);
              const isSelected = selectedStrategies.includes(strategy.id);
              
              return (
                <Tooltip key={strategy.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-1.5 rounded cursor-pointer transition-all border ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-transparent hover:bg-accent/30'
                      } ${strategy.is_active ? '' : 'opacity-40'}`}
                      onClick={() => toggleStrategySelection(strategy.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: color + '20' }}
                        >
                          <Icon className="w-2.5 h-2.5" style={{ color }} />
                        </div>
                        
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] font-semibold text-foreground truncate block">
                              {strategy.name}
                            </span>
                            {isSelected && (
                              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <span 
                            className="text-[8px] capitalize block truncate"
                            style={{ color }}
                          >
                            {strategy.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[280px] z-50">
                    <p className="font-semibold">{strategy.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{strategy.description}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>Risk: {strategy.risk_params?.risk_percent || 2}%</span>
                      <span>R:R {strategy.risk_params?.rr_ratio || 2}:1</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-1.5 py-1 border-t border-border/40 flex-shrink-0">
          <div className="flex items-center justify-between text-[8px] text-muted-foreground">
            <span>{activeStrategies.length} active</span>
            <span>{selectedStrategies.length} sel</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default StrategyPanel;
