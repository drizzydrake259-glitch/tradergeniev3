import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '../components/ui/resizable';
import Header from '../components/Header';
import ChartSection from '../components/ChartSection';
import SignalsPanel from '../components/SignalsPanel';
import MarketIntelligence from '../components/MarketIntelligence';
import AssetSelector from '../components/AssetSelector';
import StrategyPanel from '../components/StrategyPanel';
import ScannerPanel from '../components/ScannerPanel';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIMEFRAMES = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: '1D' },
];

const DEFAULT_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon' },
];

const TradingDashboard = () => {
  // State
  const [selectedCoin, setSelectedCoin] = useState(DEFAULT_COINS[0]);
  const [timeframe, setTimeframe] = useState('60');
  const [marketData, setMarketData] = useState(null);
  const [topCoins, setTopCoins] = useState([]);
  const [signals, setSignals] = useState([]);
  const [scannerSignals, setScannerSignals] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Panel visibility
  const [showStrategyPanel, setShowStrategyPanel] = useState(true);
  const [showSignalsPanel, setShowSignalsPanel] = useState(true);
  const [showMarketIntel, setShowMarketIntel] = useState(true);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  
  // Indicator toggles
  const [indicators, setIndicators] = useState({
    fvg: false,
    breakerBlocks: false,
    liquidityZones: true,
    swingHighLow: true,
    pdhPdl: false,
  });

  const intervalRef = useRef(null);

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    try {
      const coinIds = DEFAULT_COINS.map(c => c.id).join(',');
      const response = await axios.get(`${API}/market/prices?ids=${coinIds}`);
      setMarketData(response.data);
      
      const selectedData = response.data.coins.find(c => c.coin_id === selectedCoin.id);
      if (selectedData) {
        setSelectedCoin(prev => ({ ...prev, ...selectedData }));
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, [selectedCoin.id]);

  // Fetch top coins
  const fetchTopCoins = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/market/top-coins?limit=100`);
      setTopCoins(response.data.coins);
    } catch (error) {
      console.error('Error fetching top coins:', error);
    }
  }, []);

  // Fetch strategies
  const fetchStrategies = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/strategies`);
      setStrategies(response.data.strategies);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  }, []);

  // Fetch market intelligence
  const fetchIntelligence = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/intelligence/overview`);
      setIntelligence(response.data);
    } catch (error) {
      console.error('Error fetching intelligence:', error);
    }
  }, []);

  // Fetch news
  const fetchNews = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/news`);
      setNews(response.data.news);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  }, []);

  // Fetch signal history
  const fetchSignalHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/signals/history?limit=10`);
      setSignals(response.data.signals);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  }, []);

  // Run market scanner
  const runScanner = useCallback(async (strategyIds = null) => {
    setIsScanning(true);
    toast.loading('Scanning market...', { id: 'scanner' });
    
    try {
      const response = await axios.post(`${API}/scanner/scan`, {
        strategy_ids: strategyIds,
        min_confidence: 50,
        limit: 50
      });
      
      setScannerSignals(response.data.signals);
      toast.success(`Found ${response.data.signals.length} signals from ${response.data.scanned_coins} coins`, { id: 'scanner' });
    } catch (error) {
      console.error('Error scanning market:', error);
      toast.error('Scanner failed', { id: 'scanner' });
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Generate AI signal
  const generateSignal = useCallback(async () => {
    if (!marketData) return;
    
    const coinData = marketData.coins.find(c => c.coin_id === selectedCoin.id);
    if (!coinData) return;

    setIsGeneratingSignal(true);
    toast.loading('Generating AI signal...', { id: 'signal-gen' });

    try {
      const response = await axios.post(`${API}/signals/generate`, {
        coin_id: selectedCoin.id,
        symbol: selectedCoin.symbol,
        current_price: coinData.current_price,
        price_change_24h: coinData.price_change_percentage_24h,
        volume_24h: coinData.total_volume,
        high_24h: coinData.high_24h,
        low_24h: coinData.low_24h,
        market_cap: coinData.market_cap,
        timeframe: timeframe,
        indicators: indicators
      });

      setSignals(prev => [response.data, ...prev.slice(0, 9)]);
      toast.success('Signal generated successfully!', { id: 'signal-gen' });
    } catch (error) {
      console.error('Error generating signal:', error);
      toast.error('Failed to generate signal', { id: 'signal-gen' });
    } finally {
      setIsGeneratingSignal(false);
    }
  }, [marketData, selectedCoin, timeframe, indicators]);

  // Create AI strategy
  const createAIStrategy = useCallback(async (description) => {
    toast.loading('Creating AI strategy...', { id: 'ai-strategy' });
    
    try {
      const response = await axios.post(`${API}/strategies/ai/generate`, {
        description,
        market: 'crypto',
        risk_level: 'medium'
      });
      
      setStrategies(prev => [...prev, response.data]);
      toast.success(`Created: ${response.data.name}`, { id: 'ai-strategy' });
      return response.data;
    } catch (error) {
      console.error('Error creating AI strategy:', error);
      toast.error('Failed to create strategy', { id: 'ai-strategy' });
      throw error;
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMarketData(),
        fetchTopCoins(),
        fetchStrategies(),
        fetchIntelligence(),
        fetchNews(),
        fetchSignalHistory()
      ]);
      setIsLoading(false);
    };

    fetchAllData();
  }, [fetchMarketData, fetchTopCoins, fetchStrategies, fetchIntelligence, fetchNews, fetchSignalHistory]);

  // Set up polling interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchMarketData();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMarketData]);

  // Refresh intelligence every 30 seconds
  useEffect(() => {
    const intelligenceInterval = setInterval(() => {
      fetchIntelligence();
    }, 30000);

    return () => clearInterval(intelligenceInterval);
  }, [fetchIntelligence]);

  // Handle coin selection
  const handleCoinSelect = (coin) => {
    setSelectedCoin(coin);
  };

  // Handle timeframe change
  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
  };

  // Toggle indicator
  const toggleIndicator = (key) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get current coin data
  const currentCoinData = marketData?.coins?.find(c => c.coin_id === selectedCoin.id);

  // Toggle fullscreen chart
  const toggleFullscreen = () => {
    setIsChartFullscreen(!isChartFullscreen);
    if (!isChartFullscreen) {
      setShowStrategyPanel(false);
      setShowSignalsPanel(false);
      setShowMarketIntel(false);
    } else {
      setShowStrategyPanel(true);
      setShowSignalsPanel(true);
      setShowMarketIntel(true);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" data-testid="trading-dashboard">
      {/* Header */}
      <Header 
        currentCoin={currentCoinData}
        intelligence={intelligence}
      />

      {/* Main Content with Resizable Panels */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Section: Strategy + Chart + Signals */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left: Strategy Panel */}
            {showStrategyPanel && !isChartFullscreen && (
              <>
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                  <div className="h-full p-2">
                    <StrategyPanel
                      strategies={strategies}
                      onCreateAIStrategy={createAIStrategy}
                      onRunScanner={runScanner}
                      isScanning={isScanning}
                      onRefresh={fetchStrategies}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-border/30 hover:bg-primary/50 transition-colors" />
              </>
            )}
            
            {/* Center: Chart */}
            <ResizablePanel defaultSize={showStrategyPanel && showSignalsPanel ? 55 : 75}>
              <div className="h-full p-2 flex flex-col">
                {/* Asset & Timeframe Selection */}
                <AssetSelector
                  coins={topCoins.length > 0 ? topCoins : DEFAULT_COINS}
                  selectedCoin={selectedCoin}
                  onSelectCoin={handleCoinSelect}
                  timeframes={TIMEFRAMES}
                  selectedTimeframe={timeframe}
                  onSelectTimeframe={handleTimeframeChange}
                  indicators={indicators}
                  onToggleIndicator={toggleIndicator}
                  onGenerateSignal={generateSignal}
                  isGeneratingSignal={isGeneratingSignal}
                />

                {/* Chart Section with Controls */}
                <div className="flex-1 min-h-0 mt-2 relative">
                  {/* Panel Controls */}
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowStrategyPanel(!showStrategyPanel)}
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                      title={showStrategyPanel ? "Hide strategies" : "Show strategies"}
                    >
                      {showStrategyPanel ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                      title={isChartFullscreen ? "Exit fullscreen" : "Fullscreen chart"}
                    >
                      {isChartFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSignalsPanel(!showSignalsPanel)}
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                      title={showSignalsPanel ? "Hide signals" : "Show signals"}
                    >
                      {showSignalsPanel ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <ChartSection
                    selectedCoin={selectedCoin}
                    timeframe={timeframe}
                    coinData={currentCoinData}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* Right: Signals Panel */}
            {showSignalsPanel && !isChartFullscreen && (
              <>
                <ResizableHandle withHandle className="bg-border/30 hover:bg-primary/50 transition-colors" />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                  <div className="h-full p-2">
                    <ResizablePanelGroup direction="vertical">
                      {/* AI Signals */}
                      <ResizablePanel defaultSize={50} minSize={30}>
                        <SignalsPanel
                          signals={signals}
                          isLoading={isLoading}
                          currentCoin={selectedCoin}
                          title="AI Signals"
                        />
                      </ResizablePanel>
                      
                      <ResizableHandle withHandle className="bg-border/30 hover:bg-primary/50 transition-colors my-1" />
                      
                      {/* Scanner Signals */}
                      <ResizablePanel defaultSize={50} minSize={30}>
                        <ScannerPanel
                          signals={scannerSignals}
                          isLoading={isScanning}
                          onSelectCoin={handleCoinSelect}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Bottom: Market Intelligence (Collapsible) */}
        {showMarketIntel && !isChartFullscreen && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMarketIntel(!showMarketIntel)}
              className="absolute -top-3 left-1/2 transform -translate-x-1/2 h-6 w-12 bg-card border border-border/40 rounded-full z-10"
              title="Hide market intel"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <MarketIntelligence
              intelligence={intelligence}
              news={news}
              isLoading={isLoading}
            />
          </div>
        )}
        
        {/* Show market intel button when hidden */}
        {(!showMarketIntel || isChartFullscreen) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowMarketIntel(true);
              if (isChartFullscreen) setIsChartFullscreen(false);
            }}
            className="fixed bottom-2 left-1/2 transform -translate-x-1/2 h-8 px-4 bg-card border border-border/40 rounded-full z-50"
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Market Intel
          </Button>
        )}
      </main>
    </div>
  );
};

export default TradingDashboard;
