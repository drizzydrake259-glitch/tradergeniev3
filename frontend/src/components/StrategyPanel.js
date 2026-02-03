import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
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
  AlertTriangle,
  Check
} from 'lucide-react';

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
    <div className="h-full rounded-xl border border-border/40 bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-heading text-sm font-bold text-foreground">Strategies</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-6 w-6 flex-shrink-0">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-1">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Builder
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle>AI Strategy Builder</DialogTitle>
                <DialogDescription>Describe your strategy in plain English.</DialogDescription>
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
            className="w-full h-7 text-xs bg-primary text-primary-foreground"
          >
            {isScanning ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            {isScanning ? 'Scanning...' : 'Scan Market'}
          </Button>
        </div>
      </div>

      {/* Strategy List with full descriptions */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {strategies.map((strategy) => {
            const Icon = getStrategyIcon(strategy.type);
            const color = getStrategyColor(strategy.type);
            const isSelected = selectedStrategies.includes(strategy.id);
            
            return (
              <div
                key={strategy.id}
                className={`rounded-lg p-2 cursor-pointer transition-all border-2 ${
                  isSelected 
                    ? 'border-primary' 
                    : 'border-transparent hover:border-border/50'
                } ${strategy.is_active ? '' : 'opacity-40'}`}
                style={{ backgroundColor: color + '15' }}
                onClick={() => toggleStrategySelection(strategy.id)}
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + '30' }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {strategy.name}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] capitalize" style={{ color }}>
                      {strategy.type.replace('_', ' ')} • R:R {strategy.risk_params?.rr_ratio || 2}:1
                    </span>
                  </div>
                </div>
                
                {/* Description - VISIBLE with white text */}
                <p className="text-[10px] text-white/80 leading-relaxed line-clamp-2">
                  {strategy.description}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-2 py-1.5 border-t border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{activeStrategies.length} active</span>
          <span>{selectedStrategies.length} selected</span>
        </div>
      </div>
    </div>
  );
};

export default StrategyPanel;
