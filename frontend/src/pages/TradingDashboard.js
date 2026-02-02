import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Header from '../components/Header';
import ChartSection from '../components/ChartSection';
import SignalsPanel from '../components/SignalsPanel';
import MarketIntelligence from '../components/MarketIntelligence';
import AssetSelector from '../components/AssetSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIMEFRAMES = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
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
  const [intelligence, setIntelligence] = useState(null);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);
  
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
      
      // Update selected coin data
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
      const response = await axios.get(`${API}/market/top-coins?limit=20`);
      setTopCoins(response.data.coins);
    } catch (error) {
      console.error('Error fetching top coins:', error);
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

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMarketData(),
        fetchTopCoins(),
        fetchIntelligence(),
        fetchNews(),
        fetchSignalHistory()
      ]);
      setIsLoading(false);
    };

    fetchAllData();
  }, [fetchMarketData, fetchTopCoins, fetchIntelligence, fetchNews, fetchSignalHistory]);

  // Set up polling interval (5 seconds)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchMarketData();
    }, 5000);

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

  return (
    <div className="min-h-screen bg-background" data-testid="trading-dashboard">
      {/* Header */}
      <Header 
        currentCoin={currentCoinData}
        intelligence={intelligence}
      />

      {/* Main Content */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-[calc(100vh-4rem)]">
        {/* Left: Asset Selector + Chart */}
        <div className="lg:col-span-9 flex flex-col gap-4 h-full overflow-hidden">
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

          {/* Chart Section */}
          <div className="flex-1 min-h-0">
            <ChartSection
              selectedCoin={selectedCoin}
              timeframe={timeframe}
              coinData={currentCoinData}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Right: Signals Panel */}
        <div className="lg:col-span-3 h-full overflow-hidden">
          <SignalsPanel
            signals={signals}
            isLoading={isLoading}
            currentCoin={selectedCoin}
          />
        </div>
      </main>

      {/* Bottom: Market Intelligence */}
      <MarketIntelligence
        intelligence={intelligence}
        news={news}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TradingDashboard;
