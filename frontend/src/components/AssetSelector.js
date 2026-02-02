import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Sparkles, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';

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
  const indicatorLabels = {
    fvg: 'FVG',
    breakerBlocks: 'Breaker Blocks',
    liquidityZones: 'Liquidity Zones',
    swingHighLow: 'Swing H/L',
    pdhPdl: 'PDH/PDL'
  };

  return (
    <div 
      className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
      data-testid="asset-selector"
    >
      {/* Asset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="h-10 px-4 gap-2 bg-background border-border hover:bg-secondary"
            data-testid="asset-dropdown-trigger"
          >
            <span className="font-mono font-semibold text-primary">{selectedCoin.symbol}</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">{selectedCoin.name}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 bg-popover border-border"
          data-testid="asset-dropdown-content"
        >
          <ScrollArea className="h-80">
            {coins.map((coin) => (
              <DropdownMenuItem
                key={coin.id}
                onClick={() => onSelectCoin(coin)}
                className={`flex items-center justify-between py-2 px-3 cursor-pointer ${
                  selectedCoin.id === coin.id ? 'bg-primary/10 text-primary' : ''
                }`}
                data-testid={`asset-option-${coin.id}`}
              >
                <div className="flex items-center gap-3">
                  {coin.image && (
                    <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                  )}
                  <div>
                    <p className="font-mono font-semibold text-sm">{coin.symbol}</p>
                    <p className="text-xs text-muted-foreground">{coin.name}</p>
                  </div>
                </div>
                {coin.price_change_percentage_24h !== undefined && (
                  <span className={`font-mono text-xs ${
                    coin.price_change_percentage_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'
                  }`}>
                    {coin.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Timeframe Selector */}
      <Select value={selectedTimeframe} onValueChange={onSelectTimeframe}>
        <SelectTrigger 
          className="w-24 h-10 bg-background border-border"
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
      <div className="h-8 w-px bg-border/50 hidden md:block" />

      {/* Indicator Toggles */}
      <div className="hidden lg:flex items-center gap-4 flex-wrap">
        {Object.entries(indicators).map(([key, value]) => (
          <div 
            key={key} 
            className="flex items-center gap-2"
            data-testid={`indicator-toggle-${key}`}
          >
            <Switch
              checked={value}
              onCheckedChange={() => onToggleIndicator(key)}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-xs font-medium transition-colors ${
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
        className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,229,153,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,229,153,0.5)]"
        data-testid="generate-signal-btn"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isGeneratingSignal ? 'Analyzing...' : 'Generate AI Signal'}
      </Button>
    </div>
  );
};

export default AssetSelector;
