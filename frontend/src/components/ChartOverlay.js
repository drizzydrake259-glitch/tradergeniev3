import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Square, Trash2, RotateCcw, Copy, Move } from 'lucide-react';

// Drawing box component with R:R ratio - improved dragging
const DrawingBox = ({ box, onUpdate, onDelete, onDuplicate, chartHeight, isSelected, onSelect }) => {
  const [isDragging, setIsDragging] = useState(null);
  const [dragStartY, setDragStartY] = useState(null);
  const [initialBox, setInitialBox] = useState(null);
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
    e.preventDefault();
    onSelect(box.id);
    setIsDragging(type);
    setDragStartY(e.clientY);
    setInitialBox({ ...box });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !boxRef.current || !initialBox || dragStartY === null) return;
    
    const deltaY = e.clientY - dragStartY;
    
    if (isDragging === 'move') {
      const newEntryY = Math.max(20, Math.min(initialBox.entryY + deltaY, chartHeight - 20));
      const newTpY = initialBox.tpY + deltaY;
      const newSlY = initialBox.slY + deltaY;
      onUpdate({ ...box, entryY: newEntryY, tpY: newTpY, slY: newSlY });
    } else if (isDragging === 'top') {
      const newTpY = Math.max(0, Math.min(initialBox.tpY + deltaY, box.entryY - 10));
      onUpdate({ ...box, tpY: newTpY });
    } else if (isDragging === 'bottom') {
      const newSlY = Math.max(box.entryY + 10, Math.min(initialBox.slY + deltaY, chartHeight));
      onUpdate({ ...box, slY: newSlY });
    }
  }, [isDragging, box, onUpdate, chartHeight, initialBox, dragStartY]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragStartY(null);
    setInitialBox(null);
  }, []);
  
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
    <div 
      ref={boxRef} 
      className={`absolute pointer-events-auto transition-shadow ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`} 
      style={{ left: box.x, top: tpY, width: box.width, height }}
      onClick={(e) => { e.stopPropagation(); onSelect(box.id); }}
    >
      {/* TP Zone - Top drag handle */}
      <div 
        className="absolute w-full bg-[#00E599]/20 border-t-2 border-[#00E599] cursor-ns-resize hover:bg-[#00E599]/30 transition-colors"
        style={{ top: 0, height: entryFromTop }} 
        onMouseDown={(e) => handleMouseDown(e, 'top')}
      >
        <span className="absolute top-1 left-2 text-[10px] font-mono text-[#00E599] font-bold select-none">TP {isLong ? '↑' : '↓'}</span>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-[#00E599]/50 rounded" />
      </div>
      
      {/* Entry Line - Move handle */}
      <div 
        className="absolute w-full h-3 bg-white/80 cursor-move hover:bg-white transition-colors flex items-center justify-center" 
        style={{ top: entryFromTop - 1 }} 
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        <Move className="w-3 h-3 text-black/50" />
        <span className="absolute -top-5 left-2 text-[10px] font-mono text-white bg-black/80 px-1.5 py-0.5 rounded select-none">ENTRY</span>
        <span className="absolute -top-5 right-2 text-[11px] font-mono text-black bg-primary px-2 py-0.5 rounded font-bold select-none">R:R {rr}</span>
      </div>
      
      {/* SL Zone - Bottom drag handle */}
      <div 
        className="absolute w-full bg-[#FF3B30]/20 border-b-2 border-[#FF3B30] cursor-ns-resize hover:bg-[#FF3B30]/30 transition-colors"
        style={{ top: entryFromTop + 2, height: height - entryFromTop - 2 }} 
        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
      >
        <span className="absolute bottom-1 left-2 text-[10px] font-mono text-[#FF3B30] font-bold select-none">SL {isLong ? '↓' : '↑'}</span>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#FF3B30]/50 rounded" />
      </div>
      
      {/* Action buttons - only show when selected */}
      {isSelected && (
        <div className="absolute -right-3 -top-3 flex flex-col gap-1 z-50">
          <button 
            className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-lg"
            onClick={(e) => { e.stopPropagation(); onDuplicate(box); }}
            title="Duplicate box"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button 
            className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
            onClick={(e) => { e.stopPropagation(); onDelete(box.id); }}
            title="Delete box"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
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

  // US Market Hours - vertical lines (9:30 AM - 4:00 PM EST)
  // These appear as time-based markers on the chart
  if (indicators.pdhl) {
    // PDH/PDL with vertical session markers
    const pdhY = priceToY(high24h);
    const pdlY = priceToY(low24h);
    
    // Previous Day High line
    overlays.push(
      <div key="pdh" className="absolute w-full border-t-2 border-dashed border-yellow-500/70 pointer-events-none"
        style={{ top: pdhY, left: 0 }}>
        <div className="absolute left-2 -top-4 bg-yellow-500/90 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
          PDH ${high24h?.toLocaleString()}
        </div>
      </div>
    );
    
    // Previous Day Low line  
    overlays.push(
      <div key="pdl" className="absolute w-full border-t-2 border-dashed border-yellow-500/70 pointer-events-none"
        style={{ top: pdlY, left: 0 }}>
        <div className="absolute left-2 -top-4 bg-yellow-500/90 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
          PDL ${low24h?.toLocaleString()}
        </div>
      </div>
    );
    
    // US Market Open (9:30 AM EST) - Vertical line
    overlays.push(
      <div key="us-open" className="absolute h-full border-l-2 border-dashed border-blue-400/60 pointer-events-none"
        style={{ left: '15%', top: 0 }}>
        <div className="absolute top-2 -left-1 transform -rotate-90 origin-left bg-blue-500/80 text-white text-[8px] font-mono px-1 py-0.5 rounded whitespace-nowrap">
          US OPEN 9:30
        </div>
      </div>
    );
    
    // US Market Close (4:00 PM EST) - Vertical line
    overlays.push(
      <div key="us-close" className="absolute h-full border-l-2 border-dashed border-red-400/60 pointer-events-none"
        style={{ left: '85%', top: 0 }}>
        <div className="absolute top-2 -left-1 transform -rotate-90 origin-left bg-red-500/80 text-white text-[8px] font-mono px-1 py-0.5 rounded whitespace-nowrap">
          US CLOSE 16:00
        </div>
      </div>
    );
  }

  // Liquidity zones - horizontal bands at key levels where stops accumulate
  if (indicators.liquidity) {
    // Liquidity above highs (buy stops / short squeeze zone)
    const liqHighPrice = high24h * 1.005;
    const liqHighY = priceToY(liqHighPrice);
    
    overlays.push(
      <div key="liq-high" className="absolute pointer-events-none" 
        style={{ top: Math.max(0, liqHighY - 20), left: 0, width: '100%', height: 25 }}>
        <div className="h-full bg-gradient-to-b from-cyan-500/40 to-cyan-500/10 border-t-2 border-cyan-400">
          <div className="flex items-center gap-1 px-2 pt-0.5">
            <span className="text-[9px] text-cyan-300 font-mono font-bold">$$$ BUY STOPS</span>
            <span className="text-[8px] text-cyan-400/70">Liquidity pool above highs</span>
          </div>
        </div>
      </div>
    );
    
    // Liquidity below lows (sell stops / long squeeze zone)
    const liqLowPrice = low24h * 0.995;
    const liqLowY = priceToY(liqLowPrice);
    
    overlays.push(
      <div key="liq-low" className="absolute pointer-events-none" 
        style={{ top: liqLowY, left: 0, width: '100%', height: 25 }}>
        <div className="h-full bg-gradient-to-t from-cyan-500/40 to-cyan-500/10 border-b-2 border-cyan-400">
          <div className="flex items-center gap-1 px-2 pt-2">
            <span className="text-[9px] text-cyan-300 font-mono font-bold">$$$ SELL STOPS</span>
            <span className="text-[8px] text-cyan-400/70">Liquidity pool below lows</span>
          </div>
        </div>
      </div>
    );
    
    // Mid-range liquidity (equal highs/lows)
    const midPrice = (high24h + low24h) / 2;
    const midY = priceToY(midPrice);
    overlays.push(
      <div key="liq-mid" className="absolute pointer-events-none"
        style={{ top: midY - 10, left: '30%', width: '40%', height: 20 }}>
        <div className="h-full bg-cyan-500/15 border border-cyan-500/40 rounded flex items-center justify-center">
          <span className="text-[8px] text-cyan-400 font-mono">EQ Level</span>
        </div>
      </div>
    );
  }

  // FVG - Fair Value Gaps (imbalance zones)
  if (indicators.fvg) {
    if (Math.abs(change24h) > 2) {
      const fvgDirection = change24h > 0 ? 'bullish' : 'bearish';
      const fvgMidPrice = current * (1 - (change24h / 200));
      const fvgY = priceToY(fvgMidPrice);
      const fvgHeight = Math.min(Math.abs(change24h) * 2, 35);
      
      overlays.push(
        <div key="fvg-1" className="absolute pointer-events-none"
          style={{ 
            top: fvgY - fvgHeight/2, 
            left: '20%', 
            width: '35%', 
            height: fvgHeight 
          }}>
          <div className={`h-full border-l-4 ${fvgDirection === 'bullish' ? 'bg-purple-500/25 border-purple-400' : 'bg-purple-500/25 border-purple-400'}`}>
            <div className="flex items-center gap-1 px-1 pt-0.5">
              <span className="text-[9px] text-purple-300 font-mono font-bold">FVG</span>
              <span className="text-[8px] text-purple-400/80">{fvgDirection === 'bullish' ? '↑ Bullish imbalance' : '↓ Bearish imbalance'}</span>
            </div>
          </div>
        </div>
      );
      
      // Second FVG
      const fvg2Price = current * (1 - (change24h / 400));
      const fvg2Y = priceToY(fvg2Price);
      overlays.push(
        <div key="fvg-2" className="absolute pointer-events-none"
          style={{ top: fvg2Y - fvgHeight/3, left: '55%', width: '25%', height: fvgHeight * 0.6 }}>
          <div className="h-full bg-purple-500/20 border-l-4 border-purple-400">
            <span className="text-[8px] text-purple-300 font-mono font-bold ml-1">FVG</span>
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
        style={{ top: breakerY - 20, left: '15%', width: '45%', height: 40 }}>
        <div className="h-full border-2 border-dashed border-orange-500/60 bg-orange-500/10 rounded">
          <div className="flex items-center gap-1 px-1 pt-0.5">
            <span className="text-[9px] text-orange-400 font-mono font-bold">BREAKER</span>
            <span className="text-[8px] text-orange-400/70">Failed OB - expect reaction</span>
          </div>
        </div>
      </div>
    );
  }

  // Swing High/Low markers with structure labels
  if (indicators.swings) {
    const swingHighY = priceToY(high24h * 0.998);
    const swingLowY = priceToY(low24h * 1.002);
    const currentY = priceToY(current);
    
    // Swing High markers
    overlays.push(
      <div key="swing-hh-1" className="absolute pointer-events-none" style={{ left: '25%', top: swingHighY - 25 }}>
        <div className="flex flex-col items-center">
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-transparent border-b-green-500" />
          <div className="bg-green-500/90 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded mt-0.5">
            HH
          </div>
          <span className="text-[8px] text-green-400/80 mt-0.5">Higher High</span>
        </div>
      </div>
    );
    
    overlays.push(
      <div key="swing-hh-2" className="absolute pointer-events-none" style={{ left: '60%', top: swingHighY - 20 }}>
        <div className="flex flex-col items-center">
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-transparent border-b-green-500" />
          <div className="bg-green-500/90 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded mt-0.5">
            HH
          </div>
        </div>
      </div>
    );
    
    // Higher Low marker
    const hlY = priceToY(low24h * 1.02);
    overlays.push(
      <div key="swing-hl" className="absolute pointer-events-none" style={{ left: '45%', top: hlY }}>
        <div className="flex flex-col items-center">
          <div className="bg-blue-500/90 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
            HL
          </div>
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-transparent border-t-blue-500 mt-0.5" />
          <span className="text-[8px] text-blue-400/80 mt-0.5">Higher Low</span>
        </div>
      </div>
    );
    
    // Swing Low markers
    overlays.push(
      <div key="swing-ll" className="absolute pointer-events-none" style={{ left: '35%', top: swingLowY }}>
        <div className="flex flex-col items-center">
          <div className="bg-red-500/90 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
            LL
          </div>
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-transparent border-t-red-500 mt-0.5" />
          <span className="text-[8px] text-red-400/80 mt-0.5">Lower Low</span>
        </div>
      </div>
    );
    
    // Current structure indicator
    const structureType = change24h > 0 ? 'BULLISH' : 'BEARISH';
    overlays.push(
      <div key="structure-label" className="absolute pointer-events-none" style={{ right: 10, top: 10 }}>
        <div className={`px-2 py-1 rounded ${change24h > 0 ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
          <span className={`text-[10px] font-mono font-bold ${change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {structureType} STRUCTURE
          </span>
        </div>
      </div>
    );
  }
  
  return <>{overlays}</>;
};

const ChartOverlay = ({ smcIndicators, isDrawingMode, onToggleDrawing, chartDimensions, priceData }) => {
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const overlayRef = useRef(null);
  
  const chartWidth = chartDimensions?.width || 800;
  const chartHeight = chartDimensions?.height || 500;
  
  const hasActiveSMC = Object.values(smcIndicators || {}).some(Boolean);
  
  // Create a single box on click (not drag) - only if no box exists or none selected
  const handleClick = (e) => {
    if (!isDrawingMode) return;
    
    // If clicking on empty space and in drawing mode, create new box OR select existing
    const rect = overlayRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickX = e.clientX - rect.left;
    
    // Check if click is on an existing box area - if so, don't create new
    const clickedOnBox = boxes.some(box => {
      const boxTop = Math.min(box.tpY, box.slY);
      const boxBottom = Math.max(box.tpY, box.slY);
      return clickY >= boxTop && clickY <= boxBottom && clickX >= box.x && clickX <= box.x + box.width;
    });
    
    if (clickedOnBox) return;
    
    // Create new box at click position with default size
    const defaultTPDistance = 50;  // pixels above entry
    const defaultSLDistance = 30;  // pixels below entry
    
    const newBox = {
      id: Date.now(),
      x: clickX - 60,
      width: 120,
      entryY: clickY,
      tpY: clickY - defaultTPDistance,
      slY: clickY + defaultSLDistance,
    };
    
    setBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  };
  
  // Deselect when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      if (!isDrawingMode) {
        setSelectedBoxId(null);
      } else {
        handleClick(e);
      }
    }
  };
  
  const updateBox = (updatedBox) => setBoxes(prev => prev.map(b => b.id === updatedBox.id ? updatedBox : b));
  const deleteBox = (boxId) => {
    setBoxes(prev => prev.filter(b => b.id !== boxId));
    if (selectedBoxId === boxId) setSelectedBoxId(null);
  };
  const clearAllBoxes = () => {
    setBoxes([]);
    setSelectedBoxId(null);
  };
  
  const duplicateBox = (box) => {
    const newBox = {
      ...box,
      id: Date.now(),
      x: box.x + 50, // Offset the duplicate
    };
    setBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  };
  
  return (
    <>
      <div
        ref={overlayRef}
        className={`absolute inset-0 ${isDrawingMode ? 'cursor-crosshair z-20' : 'pointer-events-none z-10'}`}
        onClick={handleOverlayClick}
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
          <DrawingBox 
            key={box.id} 
            box={box} 
            onUpdate={updateBox} 
            onDelete={deleteBox} 
            onDuplicate={duplicateBox}
            chartHeight={chartHeight}
            isSelected={selectedBoxId === box.id}
            onSelect={setSelectedBoxId}
          />
        ))}
      </div>
      
      {/* R:R Box controls removed from here - will be placed above chart */}
    </>
  );
};

// Export the RRBoxControls separately for placement above chart
export const RRBoxControls = ({ isDrawingMode, onToggleDrawing, boxCount, onClearAll }) => (
  <div className="flex items-center gap-2">
    <Button
      variant={isDrawingMode ? "default" : "outline"}
      size="sm"
      onClick={onToggleDrawing}
      className={`h-8 px-3 text-xs ${isDrawingMode ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
    >
      <Square className="w-3.5 h-3.5 mr-1.5" />
      R:R Box {isDrawingMode && '(Click to place)'}
    </Button>
    
    {boxCount > 0 && (
      <Button variant="outline" size="sm" onClick={onClearAll} className="h-8 px-2 text-xs hover:text-red-400 bg-background">
        <RotateCcw className="w-3.5 h-3.5 mr-1" />
        Clear ({boxCount})
      </Button>
    )}
  </div>
);

export default ChartOverlay;
