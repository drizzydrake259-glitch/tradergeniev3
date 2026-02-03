"""
TraderGenie API Backend Tests
Tests for trading strategy engine endpoints including:
- Strategies CRUD
- Market Scanner
- Market Data
- AI Signal Generation
- Market Intelligence
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smartmoney-101.preview.emergentagent.com').rstrip('/')


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "status" in data
        assert data["status"] == "online"
        print(f"✅ API root: {data['message']}")


class TestStrategies:
    """Strategy endpoint tests"""
    
    def test_get_strategies(self):
        """Test fetching all strategies"""
        response = requests.get(f"{BASE_URL}/api/strategies")
        assert response.status_code == 200
        data = response.json()
        assert "strategies" in data
        assert "count" in data
        assert len(data["strategies"]) > 0
        print(f"✅ Found {data['count']} strategies")
        
        # Verify built-in strategies exist
        strategy_names = [s["name"] for s in data["strategies"]]
        assert "Trend Continuation" in strategy_names
        assert "Mean Reversion" in strategy_names
        assert "Meme Coin Pump Short" in strategy_names
        print("✅ Built-in strategies verified")
    
    def test_get_strategy_by_id(self):
        """Test fetching a specific strategy"""
        response = requests.get(f"{BASE_URL}/api/strategies/trend-continuation")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "trend-continuation"
        assert data["name"] == "Trend Continuation"
        assert "description" in data
        assert "entry_rules" in data
        assert data["is_builtin"] == True
        print(f"✅ Strategy details: {data['name']}")
    
    def test_get_nonexistent_strategy(self):
        """Test fetching a non-existent strategy"""
        response = requests.get(f"{BASE_URL}/api/strategies/nonexistent-strategy")
        assert response.status_code == 404
        print("✅ Non-existent strategy returns 404")


class TestMarketScanner:
    """Market scanner endpoint tests"""
    
    def test_scan_market(self):
        """Test market scanner with default settings"""
        response = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"min_confidence": 50, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        assert "scanned_coins" in data
        assert "strategies_used" in data
        assert "timestamp" in data
        
        # Scanner should return signals (using fallback data)
        assert len(data["signals"]) > 0
        print(f"✅ Scanner found {len(data['signals'])} signals from {data['scanned_coins']} coins")
        
        # Verify signal structure
        if data["signals"]:
            signal = data["signals"][0]
            assert "coin_id" in signal
            assert "symbol" in signal
            assert "signal_type" in signal
            assert "confidence" in signal
            assert "confidence_score" in signal
            assert "entry_price" in signal
            assert "take_profit" in signal
            assert "stop_loss" in signal
            assert "risk_reward" in signal
            print(f"✅ Signal structure verified: {signal['symbol']} - {signal['signal_type']}")
    
    def test_scan_with_specific_strategies(self):
        """Test scanner with specific strategy IDs"""
        response = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={
                "strategy_ids": ["trend-continuation"],
                "min_confidence": 50,
                "limit": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # All signals should be from trend-continuation strategy
        for signal in data["signals"]:
            assert signal["strategy_id"] == "trend-continuation"
        print(f"✅ Strategy-specific scan: {len(data['signals'])} signals")
    
    def test_scanner_history(self):
        """Test scanner history endpoint"""
        response = requests.get(f"{BASE_URL}/api/scanner/history?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        assert "count" in data
        print(f"✅ Scanner history: {data['count']} signals")


class TestMarketData:
    """Market data endpoint tests"""
    
    def test_get_market_prices(self):
        """Test fetching market prices"""
        response = requests.get(f"{BASE_URL}/api/market/prices?ids=bitcoin,ethereum")
        assert response.status_code == 200
        data = response.json()
        assert "coins" in data
        assert "timestamp" in data
        assert len(data["coins"]) >= 1
        
        # Verify coin data structure
        coin = data["coins"][0]
        assert "coin_id" in coin
        assert "symbol" in coin
        assert "current_price" in coin
        assert "price_change_percentage_24h" in coin
        print(f"✅ Market prices: {len(data['coins'])} coins fetched")
    
    def test_get_top_coins(self):
        """Test fetching top coins"""
        response = requests.get(f"{BASE_URL}/api/market/top-coins?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "coins" in data
        assert "timestamp" in data
        assert len(data["coins"]) <= 10
        print(f"✅ Top coins: {len(data['coins'])} coins")
    
    def test_get_trending_coins(self):
        """Test fetching trending coins"""
        response = requests.get(f"{BASE_URL}/api/market/trending")
        assert response.status_code == 200
        data = response.json()
        assert "trending" in data
        assert "timestamp" in data
        print(f"✅ Trending coins: {len(data['trending'])} coins")
    
    def test_get_global_data(self):
        """Test fetching global market data"""
        response = requests.get(f"{BASE_URL}/api/market/global")
        assert response.status_code == 200
        data = response.json()
        assert "total_market_cap" in data
        assert "total_volume" in data
        assert "market_cap_percentage" in data
        print(f"✅ Global data: Market cap ${data['total_market_cap']:,.0f}")


class TestMarketIntelligence:
    """Market intelligence endpoint tests"""
    
    def test_get_intelligence_overview(self):
        """Test market intelligence overview"""
        response = requests.get(f"{BASE_URL}/api/intelligence/overview")
        assert response.status_code == 200
        data = response.json()
        assert "global" in data
        assert "btc" in data
        assert "derivatives" in data
        assert "market_sentiment" in data
        assert "timestamp" in data
        print(f"✅ Intelligence: Sentiment is {data['market_sentiment']}")
    
    def test_get_news(self):
        """Test news endpoint"""
        response = requests.get(f"{BASE_URL}/api/news")
        assert response.status_code == 200
        data = response.json()
        assert "news" in data
        assert "timestamp" in data
        assert len(data["news"]) > 0
        
        # Verify news item structure
        news_item = data["news"][0]
        assert "id" in news_item
        assert "title" in news_item
        assert "source" in news_item
        assert "sentiment" in news_item
        print(f"✅ News: {len(data['news'])} items")


class TestSignalGeneration:
    """AI signal generation tests"""
    
    def test_generate_signal(self):
        """Test AI signal generation"""
        response = requests.post(
            f"{BASE_URL}/api/signals/generate",
            json={
                "coin_id": "bitcoin",
                "symbol": "BTC",
                "current_price": 75000,
                "price_change_24h": 2.5,
                "volume_24h": 45000000000,
                "high_24h": 76000,
                "low_24h": 73000,
                "market_cap": 1500000000000,
                "timeframe": "1h"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify signal structure
        assert "id" in data
        assert "coin_id" in data
        assert data["coin_id"] == "bitcoin"
        assert "signal_type" in data
        assert data["signal_type"] in ["BUY", "SELL", "SHORT", "HOLD"]
        assert "confidence" in data
        assert "entry_price" in data
        assert "analysis" in data
        print(f"✅ Signal generated: {data['signal_type']} with {data['confidence']} confidence")
    
    def test_get_signal_history(self):
        """Test signal history endpoint"""
        response = requests.get(f"{BASE_URL}/api/signals/history?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        assert "count" in data
        print(f"✅ Signal history: {data['count']} signals")


class TestAIStrategyBuilder:
    """AI strategy builder tests"""
    
    def test_generate_ai_strategy(self):
        """Test AI strategy generation from description"""
        response = requests.post(
            f"{BASE_URL}/api/strategies/ai/generate",
            json={
                "description": "Buy coins that have increased more than 10% in the last 24 hours with strong volume",
                "market": "crypto",
                "risk_level": "medium"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify strategy structure
        assert "id" in data
        assert "name" in data
        assert "description" in data
        assert "entry_rules" in data
        assert "risk_params" in data
        assert data.get("ai_generated") == True
        print(f"✅ AI Strategy created: {data['name']}")
        
        # Return strategy ID for cleanup
        return data["id"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
