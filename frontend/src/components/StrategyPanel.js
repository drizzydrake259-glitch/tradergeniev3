import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
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
  Plus,
  Sparkles,
  Play,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
  ChevronRight,
  Target,
  AlertTriangle
} from 'lucide-react';

const StrategyPanel = ({ 
  strategies, 
  onCreateAIStrategy, 
  onRunScanner, 
  isScanning,
  onRefresh 
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStrategies, setSelectedStrategies] = useState([]);

  const getStrategyIcon = (type) => {
    switch (type) {
      case 'trend':
        return TrendingUp;
      case 'reversal':
        return TrendingDown;
      case 'breakout':
        return Zap;
      case 'meme_short':
        return AlertTriangle;
      default:
        return Target;
    }
  };

  const getStrategyColor = (type) => {
    switch (type) {
      case 'trend':
        return '#00E599';
      case 'reversal':
        return '#FFD60A';
      case 'breakout':
        return '#00D4FF';
      case 'meme_short':
        return '#FF3B30';
      default:
        return '#8B5CF6';
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
    <div 
      className="h-full rounded-xl border border-border/40 bg-card flex flex-col"
      data-testid="strategy-panel"
    >
      {/* Header */}
      <div className="p-3 border-b border-border/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-lg font-bold text-foreground">Strategies</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-7 w-7"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 h-8">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Builder
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading">AI Strategy Builder</DialogTitle>
                <DialogDescription>
                  Describe your trading strategy in plain English. AI will convert it to executable rules.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <Textarea
                  placeholder="Example: Short meme coins that pumped 25% in the last hour with declining volume. Enter on price stall or lower high formation. Target 50% retracement with tight stop loss above recent high."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-32 bg-background border-border"
                />
                
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold mb-1">Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Be specific with percentages and timeframes</li>
                    <li>Include entry conditions, exit rules, and risk parameters</li>
                    <li>Mention volume, price action, or indicator requirements</li>
                  </ul>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  onClick={handleCreateStrategy}
                  disabled={!aiPrompt.trim() || isCreating}
                  className="bg-primary text-primary-foreground"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Strategy
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleRunScanner}
            disabled={isScanning || activeStrategies.length === 0}
            className="flex-1 h-8 bg-primary text-primary-foreground"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Scan Market
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Strategy List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {strategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layers className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No strategies loaded</p>
            </div>
          ) : (
            strategies.map((strategy) => {
              const Icon = getStrategyIcon(strategy.type);
              const color = getStrategyColor(strategy.type);
              const isSelected = selectedStrategies.includes(strategy.id);
              
              return (
                <Card
                  key={strategy.id}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  } ${strategy.is_active ? 'opacity-100' : 'opacity-50'}`}
                  onClick={() => toggleStrategySelection(strategy.id)}
                  data-testid={`strategy-card-${strategy.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono font-semibold text-sm text-foreground truncate">
                          {strategy.name}
                        </p>
                        {strategy.is_builtin && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Built-in
                          </Badge>
                        )}
                        {strategy.ai_generated && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
                            AI
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {strategy.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] px-1.5 py-0 capitalize"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            {strategy.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {strategy.timeframes?.join(', ')}
                          </span>
                        </div>
                        
                        <Switch
                          checked={strategy.is_active}
                          onClick={(e) => e.stopPropagation()}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk params */}
                  {strategy.risk_params && (
                    <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>Risk: {strategy.risk_params.risk_percent}%</span>
                      <span>R:R {strategy.risk_params.rr_ratio}:1</span>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/40">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{activeStrategies.length} active</span>
          <span>{selectedStrategies.length} selected</span>
        </div>
      </div>
    </div>
  );
};

export default StrategyPanel;
