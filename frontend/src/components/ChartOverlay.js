import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Square, Trash2, RotateCcw } from 'lucide-react';

// Drawing box component with R:R ratio
const DrawingBox = ({ box, onUpdate, onDelete, chartHeight }) => {
  const [isDragging, setIsDragging] = useState(null); // 'move', 'top', 'bottom'
  const boxRef = useRef(null);
  
  const entryY = box.entryY;
  const tpY = Math.min(box.tpY, box.slY); // TP is above for long, below for short
  const slY = Math.max(box.tpY, box.slY);
  
  const height = Math.abs(slY - tpY);
  const entryFromTop = entryY - tpY;
  
  // Calculate R:R
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
      onUpdate({
        ...box,
        entryY: clampedY,
        tpY: box.tpY + deltaY,
        slY: box.slY + deltaY
      });
    } else if (isDragging === 'top') {
      onUpdate({ ...box, tpY: clampedY });
    } else if (isDragging === 'bottom') {
      onUpdate({ ...box, slY: clampedY });
    }
  }, [isDragging, box, onUpdate, chartHeight]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
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
      className="absolute pointer-events-auto"
      style={{
        left: box.x,
        top: tpY,
        width: box.width,
        height: height,
      }}
    >
      {/* TP zone (green) */}
      <div 
        className="absolute w-full bg-[#00E599]/20 border-t-2 border-[#00E599] cursor-ns-resize"
        style={{ 
          top: 0, 
          height: entryFromTop,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'top')}
      >
        <span className="absolute top-1 left-2 text-[10px] font-mono text-[#00E599]">
          TP {isLong ? '↑' : '↓'}
        </span>
      </div>
      
      {/* Entry line */}
      <div 
        className="absolute w-full h-0.5 bg-white cursor-move"
        style={{ top: entryFromTop }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        <span className="absolute -top-3 left-2 text-[10px] font-mono text-white bg-black/50 px-1 rounded">
          ENTRY
        </span>
        <span className="absolute -top-3 right-2 text-[10px] font-mono text-white bg-primary/80 px-1.5 rounded font-bold">
          R:R {rr}
        </span>
      </div>
      
      {/* SL zone (red) */}
      <div 
        className="absolute w-full bg-[#FF3B30]/20 border-b-2 border-[#FF3B30] cursor-ns-resize"
        style={{ 
          top: entryFromTop, 
          height: height - entryFromTop,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
      >
        <span className="absolute bottom-1 left-2 text-[10px] font-mono text-[#FF3B30]">
          SL {isLong ? '↓' : '↑'}
        </span>
      </div>
      
      {/* Delete button */}
      <button
        className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
        onClick={() => onDelete(box.id)}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

// SMC Overlay indicators
const SMCOverlay = ({ indicators, chartWidth, chartHeight }) => {
  // These would need real price data to calculate properly
  // For now, show example placements
  
  const overlays = [];
  
  // FVG (Fair Value Gaps) - show example gaps
  if (indicators.fvg) {
    overlays.push(
      <div key="fvg-1" className="absolute bg-purple-500/20 border-l-2 border-purple-500" 
        style={{ left: '30%', top: '35%', width: '15%', height: '8%' }}>
        <span className="text-[8px] text-purple-400 font-mono ml-1">FVG</span>
      </div>,
      <div key="fvg-2" className="absolute bg-purple-500/20 border-l-2 border-purple-500" 
        style={{ left: '55%', top: '55%', width: '12%', height: '6%' }}>
        <span className="text-[8px] text-purple-400 font-mono ml-1">FVG</span>
      </div>
    );
  }
  
  // Breaker Blocks
  if (indicators.breakers) {
    overlays.push(
      <div key="breaker-1" className="absolute border-2 border-dashed border-orange-500/50 bg-orange-500/10" 
        style={{ left: '20%', top: '45%', width: '25%', height: '10%' }}>
        <span className="text-[8px] text-orange-400 font-mono ml-1">Breaker</span>
      </div>
    );
  }
  
  // Liquidity zones
  if (indicators.liquidity) {
    overlays.push(
      <div key="liq-high" className="absolute w-full h-0.5 bg-cyan-500/70" style={{ top: '15%' }}>
        <span className="text-[8px] text-cyan-400 font-mono ml-2 -mt-3 block">LIQ $$$ (EQH)</span>
      </div>,
      <div key="liq-low" className="absolute w-full h-0.5 bg-cyan-500/70" style={{ top: '85%' }}>
        <span className="text-[8px] text-cyan-400 font-mono ml-2 mt-0.5 block">LIQ $$$ (EQL)</span>
      </div>
    );
  }
  
  // Swing High/Low
  if (indicators.swings) {
    overlays.push(
      <div key="swing-h1" className="absolute" style={{ left: '25%', top: '20%' }}>
        <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-green-500" />
        <span className="text-[8px] text-green-400 font-mono -ml-2">HH</span>
      </div>,
      <div key="swing-h2" className="absolute" style={{ left: '60%', top: '12%' }}>
        <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-green-500" />
        <span className="text-[8px] text-green-400 font-mono -ml-2">HH</span>
      </div>,
      <div key="swing-l1" className="absolute" style={{ left: '40%', top: '75%' }}>
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-red-500" />
        <span className="text-[8px] text-red-400 font-mono -ml-2">HL</span>
      </div>
    );
  }
  
  // PDH/PDL (Previous Day High/Low)
  if (indicators.pdhl) {
    overlays.push(
      <div key="pdh" className="absolute w-full border-t border-dashed border-yellow-500" style={{ top: '22%' }}>
        <span className="text-[9px] text-yellow-400 font-mono ml-2 -mt-3 block bg-black/50 w-fit px-1">PDH</span>
      </div>,
      <div key="pdl" className="absolute w-full border-t border-dashed border-yellow-500" style={{ top: '78%' }}>
        <span className="text-[9px] text-yellow-400 font-mono ml-2 mt-0.5 block bg-black/50 w-fit px-1">PDL</span>
      </div>
    );
  }
  
  return <>{overlays}</>;
};

const ChartOverlay = ({ smcIndicators, isDrawingMode, onToggleDrawing, chartDimensions }) => {
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
  };
  
  const handleMouseUp = (e) => {
    if (!isDrawing || !startPoint) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const endY = e.clientY - rect.top;
    
    // Create new box
    const newBox = {
      id: Date.now(),
      x: startPoint.x - 50,
      width: 100,
      entryY: startPoint.y,
      tpY: Math.min(startPoint.y, endY),
      slY: Math.max(startPoint.y, endY),
    };
    
    setBoxes(prev => [...prev, newBox]);
    setIsDrawing(false);
    setStartPoint(null);
  };
  
  const updateBox = (updatedBox) => {
    setBoxes(prev => prev.map(b => b.id === updatedBox.id ? updatedBox : b));
  };
  
  const deleteBox = (boxId) => {
    setBoxes(prev => prev.filter(b => b.id !== boxId));
  };
  
  const clearAllBoxes = () => {
    setBoxes([]);
  };
  
  return (
    <>
      {/* Overlay canvas */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 z-10 ${isDrawingMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* SMC Indicators */}
        {hasActiveSMC && (
          <SMCOverlay 
            indicators={smcIndicators} 
            chartWidth={chartWidth}
            chartHeight={chartHeight}
          />
        )}
        
        {/* Drawing boxes */}
        {boxes.map(box => (
          <DrawingBox
            key={box.id}
            box={box}
            onUpdate={updateBox}
            onDelete={deleteBox}
            chartHeight={chartHeight}
          />
        ))}
        
        {/* Drawing preview */}
        {isDrawing && startPoint && (
          <div 
            className="absolute border-2 border-dashed border-white/50 bg-white/10"
            style={{
              left: startPoint.x - 50,
              top: startPoint.y,
              width: 100,
              height: 2,
            }}
          />
        )}
      </div>
      
      {/* Drawing tools bar */}
      <div className="absolute bottom-16 right-4 z-20 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1 border border-border/40">
        <Button
          variant={isDrawingMode ? "default" : "ghost"}
          size="sm"
          onClick={onToggleDrawing}
          className={`h-7 px-2 text-xs ${isDrawingMode ? 'bg-primary text-primary-foreground' : ''}`}
          title="Draw R:R Box"
        >
          <Square className="w-3 h-3 mr-1" />
          R:R Box
        </Button>
        
        {boxes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllBoxes}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-red-400"
            title="Clear all drawings"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </>
  );
};

export default ChartOverlay;
