import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  BarChart3,
  Newspaper,
  Activity,
  DollarSign
} from 'lucide-react';

const MarketIntelligence = ({ intelligence, news, isLoading }) => {
  const [volumeTimeframe, setVolumeTimeframe] = useState('24h');

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
        return 'text-[#00E599] bg-[#00E599]/10 border-[#00E599]/30';
      case 'bearish':
        return 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/30';
      default:
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  // Only show BTC funding rate
  const btcFunding = intelligence?.funding_rates?.BTC || 0;
  const btcOI = intelligence?.open_interest?.BTC || 0;
  
  // Calculate estimated 1h volume (roughly 1/24 of 24h)
  const volume24h = intelligence?.global?.total_volume_24h || 0;
  const volume1h = volume24h / 24;
  const displayVolume = volumeTimeframe === '1h' ? volume1h : volume24h;

  return (
    <div className="border-t border-border/40 bg-card/50 backdrop-blur-sm" data-testid="market-intelligence">
      {/* Stats Row */}
      <div className="border-b border-border/40">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-4 px-4 py-2.5 min-w-max">
            {/* Market Sentiment */}
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sentiment:</span>
              <Badge 
                variant="outline" 
                className={`font-mono text-xs capitalize ${getSentimentColor(intelligence?.market_sentiment)}`}
              >
                {intelligence?.market_sentiment || 'Loading...'}
              </Badge>
            </div>

            <div className="h-4 w-px bg-border/50" />

            {/* BTC Volume with Toggle */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">BTC Vol:</span>
              <span className="font-mono text-sm text-foreground">
                {formatNumber(displayVolume)}
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <Button
                  variant={volumeTimeframe === '1h' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVolumeTimeframe('1h')}
                  className={`h-5 px-1.5 text-[10px] ${volumeTimeframe === '1h' ? 'bg-primary/20 text-primary' : ''}`}
                >
                  1H
                </Button>
                <Button
                  variant={volumeTimeframe === '24h' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVolumeTimeframe('24h')}
                  className={`h-5 px-1.5 text-[10px] ${volumeTimeframe === '24h' ? 'bg-primary/20 text-primary' : ''}`}
                >
                  24H
                </Button>
              </div>
            </div>

            <div className="h-4 w-px bg-border/50" />

            {/* BTC Funding Rate */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">BTC Funding:</span>
              <span className={`font-mono text-xs ${btcFunding >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
                {(btcFunding * 100).toFixed(3)}%
              </span>
            </div>

            <div className="h-4 w-px bg-border/50" />

            {/* BTC Open Interest */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">BTC OI:</span>
              <span className="font-mono text-sm text-foreground">
                {formatNumber(btcOI)}
              </span>
            </div>

            {/* BTC Price & Change */}
            {intelligence?.btc && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#F7931A]">BTC</span>
                  <span className="font-mono text-sm text-foreground">
                    ${intelligence.btc.current_price?.toLocaleString()}
                  </span>
                  <span className={`font-mono text-xs flex items-center ${
                    intelligence.btc.price_change_percentage_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'
                  }`}>
                    {intelligence.btc.price_change_percentage_24h >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {intelligence.btc.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </div>
              </>
            )}

            {/* BTC Dominance */}
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">BTC.D:</span>
              <span className="font-mono text-sm text-foreground">
                {(intelligence?.global?.btc_dominance || 0).toFixed(1)}%
              </span>
            </div>

            {/* Total Market Cap */}
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">MCap:</span>
              <span className="font-mono text-sm text-foreground">
                {formatNumber(intelligence?.global?.total_market_cap)}
              </span>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* News Ticker */}
      <div className="relative overflow-hidden h-9">
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10" />
        
        <div className="flex items-center h-full animate-marquee whitespace-nowrap">
          <div className="flex items-center gap-2 px-4">
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">News:</span>
          </div>
          
          {[...news, ...news].map((item, index) => (
            <div 
              key={`${item.id}-${index}`}
              className="flex items-center gap-3 px-6 border-r border-border/30"
            >
              <Badge 
                variant="outline" 
                className={`text-[10px] ${getSentimentColor(item.sentiment)}`}
              >
                {item.sentiment}
              </Badge>
              <span className="text-sm text-foreground font-medium">
                {item.title}
              </span>
              <span className="text-xs text-muted-foreground">
                — {item.source}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketIntelligence;
