import React, { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Calculator, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

const TradeCalculator = ({ currentPrice = 0, symbol = 'BTC' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tradeType, setTradeType] = useState('long'); // 'long' or 'short'
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(2);
  const [leverage, setLeverage] = useState(10);
  const [entryPrice, setEntryPrice] = useState(currentPrice || 0);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);

  // Auto-update entry when current price changes
  React.useEffect(() => {
    if (currentPrice && entryPrice === 0) {
      setEntryPrice(currentPrice);
      // Set default SL/TP based on entry
      const slDistance = currentPrice * 0.02; // 2% default
      if (tradeType === 'long') {
        setStopLoss(Math.round((currentPrice - slDistance) * 100) / 100);
        setTakeProfit(Math.round((currentPrice + slDistance * 2) * 100) / 100);
      } else {
        setStopLoss(Math.round((currentPrice + slDistance) * 100) / 100);
        setTakeProfit(Math.round((currentPrice - slDistance * 2) * 100) / 100);
      }
    }
  }, [currentPrice]);

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;
    const account = parseFloat(accountSize) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const lev = parseFloat(leverage) || 1;

    if (!entry || !sl) {
      return null;
    }

    // Calculate distances
    const slDistance = Math.abs(entry - sl);
    const tpDistance = Math.abs(tp - entry);
    const slPercent = (slDistance / entry) * 100;
    const tpPercent = (tpDistance / entry) * 100;

    // Risk/Reward ratio
    const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;

    // Position sizing
    const riskAmount = (account * risk) / 100;
    const positionSize = slPercent > 0 ? riskAmount / (slPercent / 100) : 0;
    const positionSizeWithLeverage = positionSize / lev;

    // Potential P&L
    const potentialLoss = riskAmount;
    const potentialProfit = riskAmount * rrRatio;

    // Quantity (coins/contracts)
    const quantity = entry > 0 ? positionSizeWithLeverage / entry : 0;

    // Liquidation price (simplified)
    const maintenanceMargin = 0.5; // 0.5%
    const liquidationDistance = (100 / lev) - maintenanceMargin;
    const liquidationPrice = tradeType === 'long'
      ? entry * (1 - liquidationDistance / 100)
      : entry * (1 + liquidationDistance / 100);

    return {
      slPercent: slPercent.toFixed(2),
      tpPercent: tpPercent.toFixed(2),
      rrRatio: rrRatio.toFixed(2),
      riskAmount: riskAmount.toFixed(2),
      positionSize: positionSize.toFixed(2),
      positionSizeWithLeverage: positionSizeWithLeverage.toFixed(2),
      potentialLoss: potentialLoss.toFixed(2),
      potentialProfit: potentialProfit.toFixed(2),
      quantity: quantity.toFixed(6),
      liquidationPrice: liquidationPrice.toFixed(2)
    };
  }, [entryPrice, stopLoss, takeProfit, accountSize, riskPercent, leverage, tradeType]);

  return (
    <Card className="border-border/40 bg-card overflow-hidden">
      {/* Header */}
      <div 
        className="px-3 py-2 border-b border-border/40 flex items-center justify-between cursor-pointer hover:bg-accent/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="font-heading text-sm font-bold text-foreground">Trade Calculator</span>
        </div>
        <ArrowUpDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Trade Type Toggle */}
          <div className="flex gap-1">
            <Button
              variant={tradeType === 'long' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTradeType('long')}
              className={`flex-1 h-7 text-xs ${tradeType === 'long' ? 'bg-[#00E599] hover:bg-[#00E599]/90 text-black' : ''}`}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Long
            </Button>
            <Button
              variant={tradeType === 'short' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTradeType('short')}
              className={`flex-1 h-7 text-xs ${tradeType === 'short' ? 'bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white' : ''}`}
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              Short
            </Button>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Account ($)</label>
              <Input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
                className="h-7 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Risk %</label>
              <Input
                type="number"
                step="0.5"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="h-7 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Leverage</label>
              <Input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="h-7 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Entry</label>
              <Input
                type="number"
                step="0.01"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="h-7 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#FF3B30] block mb-0.5">Stop Loss</label>
              <Input
                type="number"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="h-7 text-xs bg-background border-[#FF3B30]/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#00E599] block mb-0.5">Take Profit</label>
              <Input
                type="number"
                step="0.01"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="h-7 text-xs bg-background border-[#00E599]/30"
              />
            </div>
          </div>

          {/* Results */}
          {calculations && (
            <div className="bg-background/50 rounded-lg p-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">R:R Ratio</span>
                  <span className="font-mono font-bold text-primary">{calculations.rrRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position Size</span>
                  <span className="font-mono text-foreground">${calculations.positionSizeWithLeverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Amount</span>
                  <span className="font-mono text-[#FF3B30]">-${calculations.riskAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potential Profit</span>
                  <span className="font-mono text-[#00E599]">+${calculations.potentialProfit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SL Distance</span>
                  <span className="font-mono text-[#FF3B30]">{calculations.slPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TP Distance</span>
                  <span className="font-mono text-[#00E599]">{calculations.tpPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-mono text-foreground">{calculations.quantity} {symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liq. Price</span>
                  <span className="font-mono text-yellow-500">${calculations.liquidationPrice}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TradeCalculator;
