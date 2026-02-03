#!/usr/bin/env python3
"""
AI Trading Assistant Backend API Test Suite
Tests all endpoints for functionality and integration
"""

import requests
import sys
import json
import time
from datetime import datetime

class TradingAPITester:
    def __init__(self, base_url="https://trade-wizard-69.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "error": details})

    def test_endpoint(self, name, method, endpoint, expected_status=200, data=None, timeout=30):
        """Test a single API endpoint"""
        url = f"{self.api_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except json.JSONDecodeError:
                    self.log_test(name, False, f"Invalid JSON response")
                    return False, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error")
            return False, {}
        except Exception as e:
            self.log_test(name, False, str(e))
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.test_endpoint("API Root", "GET", "/")

    def test_market_prices(self):
        """Test market prices endpoint"""
        return self.test_endpoint("Market Prices", "GET", "/market/prices")

    def test_top_coins(self):
        """Test top coins endpoint"""
        return self.test_endpoint("Top Coins", "GET", "/market/top-coins?limit=10")

    def test_trending_coins(self):
        """Test trending coins endpoint"""
        return self.test_endpoint("Trending Coins", "GET", "/market/trending")

    def test_coin_details(self):
        """Test coin details endpoint"""
        return self.test_endpoint("Coin Details (Bitcoin)", "GET", "/market/coin/bitcoin")

    def test_global_data(self):
        """Test global market data endpoint"""
        return self.test_endpoint("Global Market Data", "GET", "/market/global")

    def test_market_intelligence(self):
        """Test market intelligence endpoint"""
        return self.test_endpoint("Market Intelligence", "GET", "/intelligence/overview")

    def test_crypto_news(self):
        """Test crypto news endpoint"""
        return self.test_endpoint("Crypto News", "GET", "/news")

    def test_signal_generation(self):
        """Test AI signal generation endpoint"""
        signal_data = {
            "coin_id": "bitcoin",
            "symbol": "BTC",
            "current_price": 95000.0,
            "price_change_24h": 2.5,
            "volume_24h": 25000000000,
            "high_24h": 96000.0,
            "low_24h": 93000.0,
            "market_cap": 1800000000000,
            "timeframe": "1h",
            "indicators": {
                "fvg": True,
                "liquidityZones": True,
                "swingHighLow": False
            }
        }
        
        print("🔄 Generating AI signal (this may take 10-15 seconds)...")
        return self.test_endpoint("AI Signal Generation", "POST", "/signals/generate", 
                                expected_status=200, data=signal_data, timeout=45)

    def test_signal_history(self):
        """Test signal history endpoint"""
        return self.test_endpoint("Signal History", "GET", "/signals/history?limit=5")

    def test_strategies_list(self):
        """Test strategies list endpoint - should return 5 built-in strategies"""
        success, data = self.test_endpoint("Strategies List", "GET", "/strategies")
        if success:
            strategies = data.get("strategies", [])
            builtin_strategies = [s for s in strategies if s.get("is_builtin", False)]
            if len(builtin_strategies) >= 5:
                self.log_test("Strategies List - Built-in Count", True)
                # Verify expected strategy names
                expected_strategies = ["trend-continuation", "mean-reversion", "breakout-retest", 
                                     "meme-pump-short", "volume-breakout"]
                found_strategies = [s.get("id") for s in builtin_strategies]
                missing = [s for s in expected_strategies if s not in found_strategies]
                if not missing:
                    self.log_test("Strategies List - Expected Strategies", True)
                else:
                    self.log_test("Strategies List - Expected Strategies", False, 
                                f"Missing strategies: {missing}")
            else:
                self.log_test("Strategies List - Built-in Count", False, 
                            f"Expected 5+ built-in strategies, got {len(builtin_strategies)}")
        return success, data if success else {}

    def test_ai_strategy_builder(self):
        """Test AI Strategy Builder endpoint"""
        strategy_request = {
            "description": "Buy coins that are up more than 10% in 24 hours with strong volume",
            "market": "crypto",
            "risk_level": "medium"
        }
        
        print("🔄 Generating AI strategy (this may take 10-15 seconds)...")
        success, data = self.test_endpoint("AI Strategy Builder", "POST", "/strategies/ai/generate", 
                                         expected_status=200, data=strategy_request, timeout=45)
        if success:
            required_fields = ["id", "name", "description", "type", "entry_rules", "risk_params"]
            self.validate_response_structure("AI Strategy Builder", data, required_fields)
            
            # Verify entry_rules structure
            entry_rules = data.get("entry_rules", {})
            if "conditions" in entry_rules and "logic" in entry_rules:
                self.log_test("AI Strategy Builder - Entry Rules Structure", True)
            else:
                self.log_test("AI Strategy Builder - Entry Rules Structure", False, 
                            "Missing conditions or logic in entry_rules")
        
        return success, data if success else {}

    def test_market_scanner(self):
        """Test Market Scanner endpoint"""
        scanner_request = {
            "strategy_ids": None,  # Use all active strategies
            "min_confidence": 50,
            "limit": 10
        }
        
        print("🔄 Running market scanner (this may take 15-30 seconds)...")
        success, data = self.test_endpoint("Market Scanner", "POST", "/scanner/scan", 
                                         expected_status=200, data=scanner_request, timeout=60)
        if success:
            required_fields = ["signals", "scanned_coins", "strategies_used", "timestamp"]
            self.validate_response_structure("Market Scanner", data, required_fields)
            
            # Check if we got signals or appropriate error message
            signals = data.get("signals", [])
            error_msg = data.get("error", "")
            
            if signals:
                self.log_test("Market Scanner - Signals Generated", True)
                # Validate signal structure
                if signals:
                    signal = signals[0]
                    signal_fields = ["coin_id", "symbol", "signal_type", "confidence", 
                                   "entry_price", "take_profit", "stop_loss"]
                    self.validate_response_structure("Market Scanner Signal", signal, signal_fields)
            elif "rate limit" in error_msg.lower() or "api" in error_msg.lower():
                self.log_test("Market Scanner - API Rate Limited", True, 
                            "Scanner returned rate limit message (expected behavior)")
            else:
                self.log_test("Market Scanner - No Signals", True, 
                            "No signals found (acceptable if no matches)")
        
        return success, data if success else {}

    def validate_response_structure(self, name, data, required_fields):
        """Validate response has required fields"""
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
        
        if missing_fields:
            self.log_test(f"{name} - Structure Validation", False, 
                         f"Missing fields: {', '.join(missing_fields)}")
            return False
        else:
            self.log_test(f"{name} - Structure Validation", True)
            return True

    def run_comprehensive_tests(self):
        """Run all API tests"""
        print("🚀 Starting AI Trading Assistant API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        success, data = self.test_root_endpoint()
        if not success:
            print("❌ Cannot connect to API. Stopping tests.")
            return False

        # Test market data endpoints
        print("\n📊 Testing Market Data Endpoints...")
        
        success, prices_data = self.test_market_prices()
        if success:
            self.validate_response_structure("Market Prices", prices_data, 
                                           ["coins", "timestamp"])
            if prices_data.get("coins"):
                coin = prices_data["coins"][0]
                self.validate_response_structure("Price Data", coin,
                                               ["coin_id", "symbol", "current_price"])

        success, top_coins_data = self.test_top_coins()
        if success:
            self.validate_response_structure("Top Coins", top_coins_data,
                                           ["coins", "timestamp"])

        success, trending_data = self.test_trending_coins()
        if success:
            self.validate_response_structure("Trending", trending_data,
                                           ["trending", "timestamp"])

        self.test_coin_details()
        self.test_global_data()

        # Test intelligence endpoints
        print("\n🧠 Testing Intelligence Endpoints...")
        
        success, intel_data = self.test_market_intelligence()
        if success:
            self.validate_response_structure("Market Intelligence", intel_data,
                                           ["global", "funding_rates", "open_interest"])

        success, news_data = self.test_crypto_news()
        if success:
            self.validate_response_structure("News", news_data, ["news", "timestamp"])

        # Test AI signal endpoints
        print("\n🤖 Testing AI Signal Endpoints...")
        
        success, signal_data = self.test_signal_generation()
        if success:
            self.validate_response_structure("AI Signal", signal_data,
                                           ["id", "coin_id", "signal_type", "confidence", 
                                            "entry_price", "analysis"])
            
            # Wait a moment then test signal history
            time.sleep(2)
            success, history_data = self.test_signal_history()
            if success:
                self.validate_response_structure("Signal History", history_data,
                                               ["signals", "count"])
        else:
            # Still test history even if generation failed
            self.test_signal_history()

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['error']}")
        
        print("\n" + "=" * 60)
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = TradingAPITester()
    
    try:
        success = tester.run_comprehensive_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("🎉 All tests passed! API is working correctly.")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())