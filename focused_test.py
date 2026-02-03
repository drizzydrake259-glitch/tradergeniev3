#!/usr/bin/env python3
"""
Focused test for TraderGenie backend API endpoints as specified in review request
"""

import requests
import json
import time

def test_endpoint(name, method, url, data=None, timeout=30):
    """Test a single endpoint"""
    try:
        headers = {'Content-Type': 'application/json'}
        
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=timeout)
        
        print(f"\n🔍 {name}")
        print(f"   URL: {url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ SUCCESS")
            return True, result
        else:
            print(f"   ❌ FAILED: {response.text[:200]}")
            return False, {}
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False, {}

def main():
    base_url = "https://smartmoney-101.preview.emergentagent.com"
    
    print("🚀 TraderGenie Backend API - Focused Test")
    print("=" * 60)
    
    # 1. GET /api/strategies - Should return 5 built-in strategies
    success, data = test_endpoint(
        "1. GET /api/strategies", 
        "GET", 
        f"{base_url}/api/strategies"
    )
    if success:
        strategies = data.get("strategies", [])
        builtin_count = len([s for s in strategies if s.get("is_builtin", False)])
        print(f"   📊 Found {builtin_count} built-in strategies")
        expected = ["trend-continuation", "mean-reversion", "breakout-retest", "meme-pump-short", "volume-breakout"]
        found = [s.get("id") for s in strategies if s.get("is_builtin", False)]
        print(f"   📋 Built-in strategies: {found}")
    
    # 2. POST /api/strategies/ai/generate - AI Strategy Builder
    print(f"\n⏳ Testing AI Strategy Builder (may take 10-15 seconds)...")
    success, data = test_endpoint(
        "2. POST /api/strategies/ai/generate",
        "POST",
        f"{base_url}/api/strategies/ai/generate",
        {
            "description": "Buy coins that are up more than 10% in 24 hours with strong volume",
            "market": "crypto",
            "risk_level": "medium"
        },
        timeout=45
    )
    if success:
        print(f"   📝 Generated: {data.get('name', 'Unknown')}")
        print(f"   🎯 Type: {data.get('type', 'Unknown')}")
        print(f"   ⚙️  Conditions: {len(data.get('entry_rules', {}).get('conditions', []))}")
    
    # 3. POST /api/scanner/scan - Market Scanner
    print(f"\n⏳ Testing Market Scanner (may take 15-30 seconds)...")
    success, data = test_endpoint(
        "3. POST /api/scanner/scan",
        "POST", 
        f"{base_url}/api/scanner/scan",
        {
            "strategy_ids": None,
            "min_confidence": 50,
            "limit": 10
        },
        timeout=60
    )
    if success:
        signals = data.get("signals", [])
        scanned = data.get("scanned_coins", 0)
        strategies_used = data.get("strategies_used", 0)
        error_msg = data.get("error", "")
        
        print(f"   📊 Scanned {scanned} coins using {strategies_used} strategies")
        print(f"   🎯 Found {len(signals)} signals")
        if error_msg:
            print(f"   ⚠️  Note: {error_msg}")
    
    # 4. POST /api/signals/generate - AI Signal Generation
    print(f"\n⏳ Testing AI Signal Generation (may take 10-15 seconds)...")
    success, data = test_endpoint(
        "4. POST /api/signals/generate",
        "POST",
        f"{base_url}/api/signals/generate", 
        {
            "coin_id": "bitcoin",
            "symbol": "BTC",
            "current_price": 76000,
            "price_change_24h": 2.5,
            "volume_24h": 30000000000,
            "high_24h": 77000,
            "low_24h": 74000,
            "market_cap": 1500000000000,
            "timeframe": "1h",
            "indicators": {}
        },
        timeout=45
    )
    if success:
        print(f"   📈 Signal: {data.get('signal_type', 'Unknown')}")
        print(f"   🎯 Confidence: {data.get('confidence', 'Unknown')} ({data.get('confidence_score', 0)}%)")
        print(f"   💰 Entry: ${data.get('entry_price', 0):,.2f}")
        print(f"   🎯 TP: ${data.get('take_profit', 0):,.2f}")
        print(f"   🛑 SL: ${data.get('stop_loss', 0):,.2f}")
    
    # 5. GET /api/market/top-coins?limit=10 - Should return top 10 coins
    success, data = test_endpoint(
        "5. GET /api/market/top-coins?limit=10",
        "GET",
        f"{base_url}/api/market/top-coins?limit=10"
    )
    if success:
        coins = data.get("coins", [])
        print(f"   📊 Retrieved {len(coins)} top coins")
        if coins:
            print(f"   🥇 Top coin: {coins[0].get('name', 'Unknown')} (${coins[0].get('current_price', 0):,.2f})")
    
    print("\n" + "=" * 60)
    print("✅ Focused testing complete!")

if __name__ == "__main__":
    main()