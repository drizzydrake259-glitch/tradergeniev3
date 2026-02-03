import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Square, Trash2, RotateCcw } from 'lucide-react';

// Drawing box component with R:R ratio
const DrawingBox = ({ box, onUpdate, onDelete, chartHeight }) => {
  const [isDragging, setIsDragging] = useState(null);
  const boxRef = useRef(null);
  
  const entryY = box.entryY;
  const tpY = Math.min(box.tpY, box.slY);
  const slY = Math.max(box.tpY, box.slY);
  const height = Math.abs(slY - tpY);
  const entryFromTop = entryY - tpY;
  
  const tpDistance = Math.abs(entryY - tpY);
  const slDistance = Math.abs(slY - entryY);
  const rr = slDistance > 0 ? (tpDistance / slDistance).toFixed(1) : '0';
  const isLong = box.tpY < box.entryY;
  
  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    setIsDragging(type);
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !boxRef.current) return;
    const rect = boxRef.current.parentElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clampedY = Math.max(0, Math.min(y, chartHeight));
    
    if (isDragging === 'move') {
      const deltaY = clampedY - box.entryY;
      onUpdate({ ...box, entryY: clampedY, tpY: box.tpY + deltaY, slY: box.slY + deltaY });
    } else if (isDragging === 'top') {
      onUpdate({ ...box, tpY: clampedY });
    } else if (isDragging === 'bottom') {
      onUpdate({ ...box, slY: clampedY });
    }
  }, [isDragging, box, onUpdate, chartHeight]);
  
  const handleMouseUp = useCallback(() => setIsDragging(null), []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  return (
    <div ref={boxRef} className="absolute pointer-events-auto" style={{ left: box.x, top: tpY, width: box.width, height }}>
      <div className="absolute w-full bg-[#00E599]/20 border-t-2 border-[#00E599] cursor-ns-resize"
        style={{ top: 0, height: entryFromTop }} onMouseDown={(e) => handleMouseDown(e, 'top')}>
        <span className="absolute top-1 left-2 text-[10px] font-mono text-[#00E599] font-bold">TP {isLong ? '↑' : '↓'}</span>
      </div>
      <div className="absolute w-full h-1 bg-white cursor-move" style={{ top: entryFromTop }} onMouseDown={(e) => handleMouseDown(e, 'move')}>
        <span className="absolute -top-4 left-2 text-[10px] font-mono text-white bg-black/70 px-1 rounded">ENTRY</span>
        <span className="absolute -top-4 right-2 text-[11px] font-mono text-black bg-primary px-2 rounded font-bold">R:R {rr}</span>
      </div>
      <div className="absolute w-full bg-[#FF3B30]/20 border-b-2 border-[#FF3B30] cursor-ns-resize"
        style={{ top: entryFromTop, height: height - entryFromTop }} onMouseDown={(e) => handleMouseDown(e, 'bottom')}>
        <span className="absolute bottom-1 left-2 text-[10px] font-mono text-[#FF3B30] font-bold">SL {isLong ? '↓' : '↑'}</span>
      </div>
      <button className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-50"
        onClick={() => onDelete(box.id)}>
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

// Data-driven SMC Overlay
const SMCOverlay = ({ indicators, chartWidth, chartHeight, priceData }) => {
  const overlays = [];
  
  if (!priceData || !priceData.current) return null;
  
  const { current, high24h, low24h, change24h } = priceData;
  const priceRange = high24h - low24h;
  
  // Convert price to Y position (0 = top = high, chartHeight = bottom = low)
  const priceToY = (price) => {
    if (priceRange === 0) return chartHeight / 2;
    const percent = (high24h - price) / priceRange;
    // Add padding (10% top/bottom)
    const paddedHeight = chartHeight * 0.8;
    const offset = chartHeight * 0.1;
    return offset + (percent * paddedHeight);
  };

  // PDH/PDL - Previous Day High/Low (using 24h high/low as proxy)
  if (indicators.pdhl && high24h && low24h) {
    const pdhY = priceToY(high24h);
    const pdlY = priceToY(low24h);
    
    overlays.push(
      <div key="pdh" className="absolute w-full border-t-2 border-dashed border-yellow-500/70 pointer-events-none"
        style={{ top: pdhY, left: 0 }}>
        <div className="absolute left-2 -top-4 bg-yellow-500/90 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
          PDH ${high24h.toLocaleString()}
        </div>
      </div>,
      <div key="pdl" className="absolute w-full border-t-2 border-dashed border-yellow-500/70 pointer-events-none"
        style={{ top: pdlY, left: 0 }}>
        <div className="absolute left-2 -top-4 bg-yellow-500/90 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
          PDL ${low24h.toLocaleString()}
        </div>
      </div>
    );
  }

  // Liquidity zones - at equal highs/lows (approximated near high/low)
  if (indicators.liquidity) {
    const liqHighY = priceToY(high24h * 1.002); // Just above high
    const liqLowY = priceToY(low24h * 0.998); // Just below low
    
    overlays.push(
      <div key="liq-high" className="absolute pointer-events-none" style={{ top: liqHighY - 15, left: 0, width: '100%' }}>
        <div className="h-4 bg-gradient-to-b from-cyan-500/30 to-transparent border-t-2 border-cyan-500">
          <span className="text-[9px] text-cyan-400 font-mono font-bold ml-2">$$$ LIQUIDITY (EQH) $$$</span>
        </div>
      </div>,
      <div key="liq-low" className="absolute pointer-events-none" style={{ top: liqLowY, left: 0, width: '100%' }}>
        <div className="h-4 bg-gradient-to-t from-cyan-500/30 to-transparent border-b-2 border-cyan-500">
          <span className="text-[9px] text-cyan-400 font-mono font-bold ml-2 block mt-0.5">$$$ LIQUIDITY (EQL) $$$</span>
        </div>
      </div>
    );
  }

  // FVG - Fair Value Gaps (estimated based on price movement)
  if (indicators.fvg) {
    // If price moved significantly, there's likely FVGs
    if (Math.abs(change24h) > 2) {
      const fvgDirection = change24h > 0 ? 'bullish' : 'bearish';
      const fvgMidPrice = current * (1 - (change24h / 200)); // Midpoint of recent move
      const fvgY = priceToY(fvgMidPrice);
      const fvgHeight = Math.min(Math.abs(change24h) * 2, 30);
      
      overlays.push(
        <div key="fvg-1" className="absolute pointer-events-none"
          style={{ 
            top: fvgY - fvgHeight/2, 
            left: '25%', 
            width: '30%', 
            height: fvgHeight 
          }}>
          <div className={`h-full border-l-4 ${fvgDirection === 'bullish' ? 'bg-purple-500/25 border-purple-500' : 'bg-purple-500/25 border-purple-500'}`}>
            <span className="text-[8px] text-purple-400 font-mono font-bold ml-1">FVG {fvgDirection === 'bullish' ? '↑' : '↓'}</span>
          </div>
        </div>
      );
      
      // Add another FVG zone
      const fvg2Price = current * (1 - (change24h / 400));
      const fvg2Y = priceToY(fvg2Price);
      overlays.push(
        <div key="fvg-2" className="absolute pointer-events-none"
          style={{ top: fvg2Y - fvgHeight/3, left: '55%', width: '20%', height: fvgHeight * 0.7 }}>
          <div className="h-full bg-purple-500/20 border-l-4 border-purple-500">
            <span className="text-[8px] text-purple-400 font-mono font-bold ml-1">FVG</span>
          </div>
        </div>
      );
    }
  }

  // Breaker Blocks
  if (indicators.breakers) {
    const breakerPrice = current * (1 + (change24h > 0 ? -0.03 : 0.03));
    const breakerY = priceToY(breakerPrice);
    
    overlays.push(
      <div key="breaker" className="absolute pointer-events-none"
        style={{ top: breakerY - 20, left: '20%', width: '40%', height: 40 }}>
        <div className="h-full border-2 border-dashed border-orange-500/60 bg-orange-500/10 rounded">
          <span className="text-[8px] text-orange-400 font-mono font-bold ml-1 mt-0.5 block">BREAKER BLOCK</span>
        </div>
      </div>
    );
  }

  // Swing High/Low markers
  if (indicators.swings) {
    const swingHY = priceToY(high24h * 0.995);
    const swingLY = priceToY(low24h * 1.005);
    const swing2Y = priceToY(current);
    
    overlays.push(
      // Higher High
      <div key="swing-hh" className="absolute pointer-events-none" style={{ left: '30%', top: swingHY - 10 }}>
        <div className="flex flex-col items-center">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-transparent border-b-green-500" />
          <span className="text-[9px] text-green-400 font-mono font-bold mt-0.5">HH</span>
        </div>
      </div>,
      // Higher High 2
      <div key="swing-hh2" className="absolute pointer-events-none" style={{ left: '65%', top: swingHY }}>
        <div className="flex flex-col items-center">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-transparent border-b-green-500" />
          <span className="text-[9px] text-green-400 font-mono font-bold mt-0.5">HH</span>
        </div>
      </div>,
      // Current price marker
      <div key="swing-c" className="absolute pointer-events-none" style={{ left: '80%', top: swing2Y - 5 }}>
        <div className="flex flex-col items-center">
          <div className={`w-0 h-0 border-l-[5px] border-r-[5px] ${change24h > 0 ? 'border-b-[8px] border-transparent border-b-blue-500' : 'border-t-[8px] border-transparent border-t-blue-500'}`} />
          <span className="text-[8px] text-blue-400 font-mono font-bold">{change24h > 0 ? 'HL' : 'LH'}</span>
        </div>
      </div>,
      // Lower Low
      <div key="swing-ll" className="absolute pointer-events-none" style={{ left: '45%', top: swingLY }}>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-red-400 font-mono font-bold mb-0.5">LL</span>
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-transparent border-t-red-500" />
        </div>
      </div>
    );
  }
  
  return <>{overlays}</>;
};

const ChartOverlay = ({ smcIndicators, isDrawingMode, onToggleDrawing, chartDimensions, priceData }) => {
  const [boxes, setBoxes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const overlayRef = useRef(null);
  
  const chartWidth = chartDimensions?.width || 800;
  const chartHeight = chartDimensions?.height || 500;
  
  const hasActiveSMC = Object.values(smcIndicators || {}).some(Boolean);
  
  const handleMouseDown = (e) => {
    if (!isDrawingMode) return;
    const rect = overlayRef.current.getBoundingClientRect();
    setIsDrawing(true);
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  
  const handleMouseUp = (e) => {
    if (!isDrawing || !startPoint) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const endY = e.clientY - rect.top;
    
    const newBox = {
      id: Date.now(),
      x: startPoint.x - 60,
      width: 120,
      entryY: startPoint.y,
      tpY: Math.min(startPoint.y, endY),
      slY: Math.max(startPoint.y, endY),
    };
    
    setBoxes(prev => [...prev, newBox]);
    setIsDrawing(false);
    setStartPoint(null);
  };
  
  const updateBox = (updatedBox) => setBoxes(prev => prev.map(b => b.id === updatedBox.id ? updatedBox : b));
  const deleteBox = (boxId) => setBoxes(prev => prev.filter(b => b.id !== boxId));
  const clearAllBoxes = () => setBoxes([]);
  
  return (
    <>
      <div
        ref={overlayRef}
        className={`absolute inset-0 ${isDrawingMode ? 'cursor-crosshair z-20' : 'pointer-events-none z-10'}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {hasActiveSMC && (
          <SMCOverlay 
            indicators={smcIndicators} 
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            priceData={priceData}
          />
        )}
        
        {boxes.map(box => (
          <DrawingBox key={box.id} box={box} onUpdate={updateBox} onDelete={deleteBox} chartHeight={chartHeight} />
        ))}
        
        {isDrawing && startPoint && (
          <div className="absolute border-2 border-dashed border-white/50 bg-white/10"
            style={{ left: startPoint.x - 60, top: startPoint.y, width: 120, height: 2 }} />
        )}
      </div>
      
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-lg p-1.5 border border-border/40 shadow-lg">
        <Button
          variant={isDrawingMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleDrawing}
          className={`h-8 px-3 text-xs ${isDrawingMode ? 'bg-primary text-primary-foreground' : ''}`}
        >
          <Square className="w-3.5 h-3.5 mr-1.5" />
          R:R Box
        </Button>
        
        {boxes.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllBoxes} className="h-8 px-2 text-xs hover:text-red-400">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Clear ({boxes.length})
          </Button>
        )}
      </div>
    </>
  );
};

export default ChartOverlay;
