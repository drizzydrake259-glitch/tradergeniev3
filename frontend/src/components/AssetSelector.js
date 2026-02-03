import React, { useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, ChevronDown, Search, Plus } from 'lucide-react';
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

const AVAILABLE_INDICATORS = [
  { id: 'rsi', name: 'RSI', study: 'RSI@tv-basicstudies' },
  { id: 'macd', name: 'MACD', study: 'MACD@tv-basicstudies' },
  { id: 'ema', name: 'EMA (20)', study: 'MASimple@tv-basicstudies' },
  { id: 'bb', name: 'Bollinger Bands', study: 'BB@tv-basicstudies' },
  { id: 'volume', name: 'Volume', study: 'Volume@tv-basicstudies' },
  { id: 'vwap', name: 'VWAP', study: 'VWAP@tv-basicstudies' },
  { id: 'stoch', name: 'Stochastic', study: 'Stochastic@tv-basicstudies' },
  { id: 'atr', name: 'ATR', study: 'ATR@tv-basicstudies' },
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
  onToggleIndicator
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCoins = coins.filter(coin => 
    coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <DropdownMenuContent 
          className="w-72 bg-popover border-border p-2"
          data-testid="asset-dropdown-content"
        >
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
                onClick={() => {
                  onSelectCoin(coin);
                  setSearchQuery('');
                }}
                className={`flex items-center justify-between py-2 px-2 cursor-pointer rounded-md ${
                  selectedCoin.id === coin.id ? 'bg-primary/10 text-primary' : ''
                }`}
                data-testid={`asset-option-${coin.id}`}
              >
                <div className="flex items-center gap-2">
                  {coin.image && (
                    <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                  )}
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
        <SelectTrigger 
          className="w-20 h-9 bg-background border-border text-sm"
          data-testid="timeframe-selector"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {timeframes.map((tf) => (
            <SelectItem 
              key={tf.value} 
              value={tf.value}
              data-testid={`timeframe-option-${tf.value}`}
            >
              <span className="font-mono">{tf.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Divider */}
      <div className="h-6 w-px bg-border/50 hidden md:block" />

      {/* Indicators Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="h-9 px-3 gap-2 bg-background border-border hover:bg-secondary"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Indicators</span>
            {activeIndicators.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded font-mono">
                {activeIndicators.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 bg-popover border-border">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Add to Chart
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {AVAILABLE_INDICATORS.map((indicator) => {
            const isActive = activeIndicators.includes(indicator.id);
            return (
              <DropdownMenuItem
                key={indicator.id}
                onClick={() => onToggleIndicator(indicator.id)}
                className={`cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-primary' : 'bg-muted'}`} />
                {indicator.name}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onToggleIndicator('clear-all')}
            className="text-muted-foreground text-xs"
          >
            Clear All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate Signal Button */}
      <Button
        onClick={onGenerateSignal}
        disabled={isGeneratingSignal}
        className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all hover:shadow-[0_0_25px_rgba(0,229,153,0.5)]"
        data-testid="generate-signal-btn"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isGeneratingSignal ? 'Analyzing...' : 'AI Signal'}
      </Button>
    </div>
  );
};

export { AVAILABLE_INDICATORS };
export default AssetSelector;
