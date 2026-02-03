import React, { useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, ChevronDown, Search, Plus, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

// Standard TradingView indicators
const STANDARD_INDICATORS = [
  { id: 'rsi', name: 'RSI', study: 'RSI@tv-basicstudies' },
  { id: 'macd', name: 'MACD', study: 'MACD@tv-basicstudies' },
  { id: 'ema', name: 'EMA (20)', study: 'MAExp@tv-basicstudies' },
  { id: 'bb', name: 'Bollinger Bands', study: 'BB@tv-basicstudies' },
  { id: 'volume', name: 'Volume', study: 'Volume@tv-basicstudies' },
  { id: 'vwap', name: 'VWAP', study: 'VWAP@tv-basicstudies' },
  { id: 'stoch', name: 'Stochastic', study: 'Stochastic@tv-basicstudies' },
  { id: 'atr', name: 'ATR', study: 'ATR@tv-basicstudies' },
];

// SMC / ICT style indicators
const SMC_INDICATORS = [
  { id: 'fvg', name: 'FVG (Fair Value Gaps)', description: 'Show imbalance zones' },
  { id: 'breakers', name: 'Breaker Blocks', description: 'Failed order blocks' },
  { id: 'liquidity', name: 'Liquidity Sweeps', description: 'Equal highs/lows hunts' },
  { id: 'swings', name: 'Swing High/Low', description: 'Market structure points' },
  { id: 'pdhl', name: 'PDH/PDL', description: 'Previous day high/low' },
];

const AssetSelector = ({
  coins,
  selectedCoin,
  onSelectCoin,
  timeframes,
  selectedTimeframe,
  onSelectTimeframe,
  onGenerateSignal,
  isGeneratingSignal,
  activeIndicators,
  onToggleIndicator,
  smcIndicators,
  onToggleSMC
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCoins = coins.filter(coin => 
    coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSMCCount = Object.values(smcIndicators || {}).filter(Boolean).length;

  return (
    <div 
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
      data-testid="asset-selector"
    >
      {/* Asset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="h-9 px-3 gap-2 bg-background border-border hover:bg-secondary"
            data-testid="asset-dropdown-trigger"
          >
            {selectedCoin.image && (
              <img src={selectedCoin.image} alt={selectedCoin.symbol} className="w-5 h-5 rounded-full" />
            )}
            <span className="font-mono font-semibold text-primary">{selectedCoin.symbol}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 bg-popover border-border p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-background border-border text-sm"
            />
          </div>
          
          <ScrollArea className="h-80">
            {filteredCoins.map((coin) => (
              <DropdownMenuItem
                key={coin.id}
                onClick={() => { onSelectCoin(coin); setSearchQuery(''); }}
                className={`flex items-center justify-between py-2 px-2 cursor-pointer rounded-md ${
                  selectedCoin.id === coin.id ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {coin.image && <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />}
                  <div>
                    <p className="font-mono font-semibold text-sm">{coin.symbol}</p>
                    <p className="text-[10px] text-muted-foreground">{coin.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {coin.current_price && (
                    <p className="font-mono text-xs text-foreground">
                      ${coin.current_price >= 1 
                        ? coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : coin.current_price.toFixed(6)
                      }
                    </p>
                  )}
                  {coin.price_change_percentage_24h !== undefined && (
                    <span className={`font-mono text-[10px] ${
                      coin.price_change_percentage_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'
                    }`}>
                      {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                      {coin.price_change_percentage_24h?.toFixed(1)}%
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Timeframe Selector */}
      <Select value={selectedTimeframe} onValueChange={onSelectTimeframe}>
        <SelectTrigger className="w-20 h-9 bg-background border-border text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {timeframes.map((tf) => (
            <SelectItem key={tf.value} value={tf.value}>
              <span className="font-mono">{tf.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Divider */}
      <div className="h-6 w-px bg-border/50" />

      {/* Standard Indicators Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 px-3 gap-2 bg-background border-border hover:bg-secondary">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Indicators</span>
            {activeIndicators.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{activeIndicators.length}</Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 bg-popover border-border">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Standard Indicators</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STANDARD_INDICATORS.map((indicator) => {
            const isActive = activeIndicators.includes(indicator.id);
            return (
              <DropdownMenuItem
                key={indicator.id}
                onClick={() => onToggleIndicator(indicator.id)}
                className={`cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              >
                {isActive && <Check className="w-3 h-3 mr-2" />}
                {!isActive && <span className="w-3 mr-2" />}
                {indicator.name}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onToggleIndicator('clear-all')} className="text-muted-foreground text-xs">
            Clear All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* SMC Indicators */}
      <div className="flex items-center gap-1">
        {SMC_INDICATORS.map((ind) => {
          const isActive = smcIndicators?.[ind.id];
          return (
            <Button
              key={ind.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleSMC(ind.id)}
              className={`h-7 px-2 text-[10px] font-mono ${
                isActive ? 'bg-primary/20 text-primary border-primary/50' : 'bg-background'
              }`}
              title={ind.description}
            >
              {ind.id === 'pdhl' ? 'PDH/PDL' : ind.id.toUpperCase()}
            </Button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate Signal Button */}
      <Button
        onClick={onGenerateSignal}
        disabled={isGeneratingSignal}
        className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,229,153,0.3)]"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isGeneratingSignal ? 'Analyzing...' : 'AI Signal'}
      </Button>
    </div>
  );
};

export { STANDARD_INDICATORS, SMC_INDICATORS };
export default AssetSelector;
