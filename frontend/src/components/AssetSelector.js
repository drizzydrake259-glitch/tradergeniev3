import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Sparkles, ChevronDown, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { useState } from 'react';

const AssetSelector = ({
  coins,
  selectedCoin,
  onSelectCoin,
  timeframes,
  selectedTimeframe,
  onSelectTimeframe,
  indicators,
  onToggleIndicator,
  onGenerateSignal,
  isGeneratingSignal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const indicatorLabels = {
    fvg: 'FVG',
    breakerBlocks: 'Breakers',
    liquidityZones: 'Liquidity',
    swingHighLow: 'Swings',
    pdhPdl: 'PDH/PDL'
  };

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
          {/* Search */}
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

      {/* Indicator Toggles - Compact */}
      <div className="hidden xl:flex items-center gap-3 flex-wrap">
        {Object.entries(indicators).map(([key, value]) => (
          <div 
            key={key} 
            className="flex items-center gap-1.5"
            data-testid={`indicator-toggle-${key}`}
          >
            <Switch
              checked={value}
              onCheckedChange={() => onToggleIndicator(key)}
              className="scale-75 data-[state=checked]:bg-primary"
            />
            <span className={`text-[10px] font-medium transition-colors ${
              value ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {indicatorLabels[key]}
            </span>
          </div>
        ))}
      </div>

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

export default AssetSelector;
