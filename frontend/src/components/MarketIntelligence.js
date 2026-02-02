import React from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Badge } from './ui/badge';
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

  const fundingRates = intelligence?.funding_rates || {};
  const openInterest = intelligence?.open_interest || {};

  return (
    <div 
      className="border-t border-border/40 bg-card/50 backdrop-blur-sm"
      data-testid="market-intelligence"
    >
      {/* Stats Row */}
      <div className="border-b border-border/40">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-6 px-4 py-3 min-w-max">
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

            {/* Divider */}
            <div className="h-4 w-px bg-border/50" />

            {/* Total Volume */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">24h Vol:</span>
              <span className="font-mono text-sm text-foreground">
                {formatNumber(intelligence?.global?.total_volume_24h)}
              </span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border/50" />

            {/* Funding Rates */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Funding:
              </span>
              {Object.entries(fundingRates).map(([symbol, rate]) => (
                <div key={symbol} className="flex items-center gap-1">
                  <span className="font-mono text-xs text-muted-foreground">{symbol}:</span>
                  <span className={`font-mono text-xs ${rate >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
                    {(rate * 100).toFixed(3)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border/50" />

            {/* Open Interest */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">OI:</span>
              <span className="font-mono text-sm text-foreground">
                {formatNumber(openInterest.total)}
              </span>
            </div>

            {/* BTC Info */}
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

            {/* ETH Info */}
            {intelligence?.eth && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#627EEA]">ETH</span>
                  <span className="font-mono text-sm text-foreground">
                    ${intelligence.eth.current_price?.toLocaleString()}
                  </span>
                  <span className={`font-mono text-xs flex items-center ${
                    intelligence.eth.price_change_percentage_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'
                  }`}>
                    {intelligence.eth.price_change_percentage_24h >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {intelligence.eth.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* News Ticker */}
      <div className="relative overflow-hidden h-10">
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10" />
        
        <div className="flex items-center h-full animate-marquee whitespace-nowrap">
          <div className="flex items-center gap-2 px-4">
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Latest News:</span>
          </div>
          
          {/* Double the news items for seamless loop */}
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
