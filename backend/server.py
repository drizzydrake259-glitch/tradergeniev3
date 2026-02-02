from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="AI Trading Assistant API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CoinGecko Base URL
COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Simple in-memory cache
cache = {}
CACHE_DURATION = 30  # seconds

# ==================== MODELS ====================

class PriceData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coin_id: str
    symbol: str
    name: str
    current_price: float
    price_change_24h: Optional[float] = 0
    price_change_percentage_24h: Optional[float] = 0
    market_cap: Optional[float] = 0
    total_volume: Optional[float] = 0
    high_24h: Optional[float] = 0
    low_24h: Optional[float] = 0
    last_updated: str

class MarketData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coins: List[PriceData]
    timestamp: str

class TradeSignal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coin_id: str
    symbol: str
    signal_type: str  # BUY, SELL, HOLD
    confidence: str  # HIGH, MEDIUM, LOW
    entry_price: float
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    analysis: str
    indicators: Dict[str, Any] = {}
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SignalRequest(BaseModel):
    coin_id: str
    symbol: str
    current_price: float
    price_change_24h: float
    volume_24h: float
    high_24h: float
    low_24h: float
    market_cap: Optional[float] = 0
    timeframe: str = "1h"
    indicators: Dict[str, bool] = {}

class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = ""
    url: Optional[str] = ""
    source: str
    published_at: str
    sentiment: Optional[str] = "neutral"

# ==================== COINGECKO API ====================

def get_cache(key: str):
    """Get value from cache if not expired"""
    if key in cache:
        data, timestamp = cache[key]
        if (datetime.now(timezone.utc) - timestamp).total_seconds() < CACHE_DURATION:
            return data
    return None

def set_cache(key: str, data: Any):
    """Set value in cache"""
    cache[key] = (data, datetime.now(timezone.utc))

async def fetch_coingecko(endpoint: str, params: dict = None, cache_key: str = None):
    """Fetch data from CoinGecko API with caching"""
    # Check cache first
    if cache_key:
        cached = get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for {cache_key}")
            return cached
    
    async with httpx.AsyncClient() as client:
        try:
            await asyncio.sleep(0.5)  # Rate limit protection
            response = await client.get(
                f"{COINGECKO_BASE}{endpoint}",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Store in cache
            if cache_key:
                set_cache(cache_key, data)
            
            return data
        except httpx.HTTPStatusError as e:
            logger.error(f"CoinGecko API error: {e}")
            # Return cached data if available, even if expired
            if cache_key and cache_key in cache:
                logger.info(f"Using stale cache for {cache_key}")
                return cache[cache_key][0]
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            logger.error(f"CoinGecko fetch error: {e}")
            if cache_key and cache_key in cache:
                return cache[cache_key][0]
            raise HTTPException(status_code=500, detail=str(e))

# ==================== MARKET ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "AI Trading Assistant API", "status": "online"}

@api_router.get("/market/prices")
async def get_market_prices(
    ids: str = Query("bitcoin,ethereum,solana,dogecoin,cardano,ripple,polkadot,avalanche-2,chainlink,polygon"),
    vs_currency: str = "usd"
):
    """Get current prices for multiple cryptocurrencies"""
    try:
        cache_key = f"prices_{ids}_{vs_currency}"
        data = await fetch_coingecko("/coins/markets", {
            "vs_currency": vs_currency,
            "ids": ids,
            "order": "market_cap_desc",
            "sparkline": "false",
            "price_change_percentage": "24h"
        }, cache_key=cache_key)
        
        coins = []
        for coin in data:
            coins.append(PriceData(
                coin_id=coin.get('id', ''),
                symbol=coin.get('symbol', '').upper(),
                name=coin.get('name', ''),
                current_price=coin.get('current_price', 0) or 0,
                price_change_24h=coin.get('price_change_24h', 0) or 0,
                price_change_percentage_24h=coin.get('price_change_percentage_24h', 0) or 0,
                market_cap=coin.get('market_cap', 0) or 0,
                total_volume=coin.get('total_volume', 0) or 0,
                high_24h=coin.get('high_24h', 0) or 0,
                low_24h=coin.get('low_24h', 0) or 0,
                last_updated=coin.get('last_updated', datetime.now(timezone.utc).isoformat())
            ))
        
        return MarketData(
            coins=coins,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching market prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/market/top-coins")
async def get_top_coins(limit: int = 20, vs_currency: str = "usd"):
    """Get top cryptocurrencies by market cap"""
    try:
        cache_key = f"top_coins_{limit}_{vs_currency}"
        data = await fetch_coingecko("/coins/markets", {
            "vs_currency": vs_currency,
            "order": "market_cap_desc",
            "per_page": limit,
            "page": 1,
            "sparkline": "false",
            "price_change_percentage": "24h"
        }, cache_key=cache_key)
        
        coins = []
        for coin in data:
            coins.append({
                "id": coin.get('id', ''),
                "symbol": coin.get('symbol', '').upper(),
                "name": coin.get('name', ''),
                "image": coin.get('image', ''),
                "current_price": coin.get('current_price', 0) or 0,
                "price_change_percentage_24h": coin.get('price_change_percentage_24h', 0) or 0,
                "market_cap": coin.get('market_cap', 0) or 0,
                "market_cap_rank": coin.get('market_cap_rank', 0) or 0,
                "total_volume": coin.get('total_volume', 0) or 0
            })
        
        return {"coins": coins, "timestamp": datetime.now(timezone.utc).isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching top coins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/market/trending")
async def get_trending_coins():
    """Get trending cryptocurrencies"""
    try:
        cache_key = "trending"
        data = await fetch_coingecko("/search/trending", cache_key=cache_key)
        
        trending = []
        for item in data.get('coins', [])[:10]:
            coin = item.get('item', {})
            trending.append({
                "id": coin.get('id', ''),
                "name": coin.get('name', ''),
                "symbol": coin.get('symbol', '').upper(),
                "market_cap_rank": coin.get('market_cap_rank', 0),
                "thumb": coin.get('thumb', ''),
                "score": coin.get('score', 0)
            })
        
        return {"trending": trending, "timestamp": datetime.now(timezone.utc).isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching trending coins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/market/coin/{coin_id}")
async def get_coin_details(coin_id: str):
    """Get detailed information about a specific coin"""
    try:
        cache_key = f"coin_{coin_id}"
        data = await fetch_coingecko(f"/coins/{coin_id}", {
            "localization": "false",
            "tickers": "false",
            "market_data": "true",
            "community_data": "false",
            "developer_data": "false"
        }, cache_key=cache_key)
        
        market_data = data.get('market_data', {})
        
        return {
            "id": data.get('id', ''),
            "symbol": data.get('symbol', '').upper(),
            "name": data.get('name', ''),
            "image": data.get('image', {}).get('large', ''),
            "current_price": market_data.get('current_price', {}).get('usd', 0),
            "price_change_24h": market_data.get('price_change_24h', 0) or 0,
            "price_change_percentage_24h": market_data.get('price_change_percentage_24h', 0) or 0,
            "market_cap": market_data.get('market_cap', {}).get('usd', 0),
            "market_cap_rank": data.get('market_cap_rank', 0),
            "total_volume": market_data.get('total_volume', {}).get('usd', 0),
            "high_24h": market_data.get('high_24h', {}).get('usd', 0),
            "low_24h": market_data.get('low_24h', {}).get('usd', 0),
            "ath": market_data.get('ath', {}).get('usd', 0),
            "atl": market_data.get('atl', {}).get('usd', 0),
            "circulating_supply": market_data.get('circulating_supply', 0),
            "total_supply": market_data.get('total_supply', 0),
            "last_updated": data.get('last_updated', datetime.now(timezone.utc).isoformat())
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching coin details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/market/global")
async def get_global_data():
    """Get global cryptocurrency market data"""
    try:
        cache_key = "global"
        data = await fetch_coingecko("/global", cache_key=cache_key)
        global_data = data.get('data', {})
        
        return {
            "total_market_cap": global_data.get('total_market_cap', {}).get('usd', 0),
            "total_volume": global_data.get('total_volume', {}).get('usd', 0),
            "market_cap_percentage": global_data.get('market_cap_percentage', {}),
            "market_cap_change_percentage_24h": global_data.get('market_cap_change_percentage_24h_usd', 0),
            "active_cryptocurrencies": global_data.get('active_cryptocurrencies', 0),
            "markets": global_data.get('markets', 0),
            "updated_at": global_data.get('updated_at', 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching global data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AI SIGNAL GENERATION ====================

@api_router.post("/signals/generate", response_model=TradeSignal)
async def generate_trade_signal(request: SignalRequest):
    """Generate AI-powered trade signals using GPT-5.2"""
    try:
        # Build the prompt for AI analysis
        indicator_text = ""
        if request.indicators:
            active_indicators = [k for k, v in request.indicators.items() if v]
            if active_indicators:
                indicator_text = f"\nActive analysis indicators: {', '.join(active_indicators)}"
        
        prompt = f"""You are an expert crypto trader and technical analyst. Analyze the following market data and provide a trading signal.

Asset: {request.symbol} ({request.coin_id})
Timeframe: {request.timeframe}
Current Price: ${request.current_price:,.2f}
24h Change: {request.price_change_24h:+.2f}% 
24h Volume: ${request.volume_24h:,.0f}
24h High: ${request.high_24h:,.2f}
24h Low: ${request.low_24h:,.2f}
Market Cap: ${request.market_cap:,.0f}
{indicator_text}

Based on this data, provide:
1. Signal Type: BUY, SELL, or HOLD
2. Confidence Level: HIGH, MEDIUM, or LOW
3. Entry Price (current or suggested)
4. Take Profit level (realistic target)
5. Stop Loss level (risk management)
6. Brief analysis (2-3 sentences explaining the reasoning)
7. Key indicators to watch

Format your response as JSON:
{{
    "signal_type": "BUY/SELL/HOLD",
    "confidence": "HIGH/MEDIUM/LOW",
    "entry_price": <number>,
    "take_profit": <number>,
    "stop_loss": <number>,
    "analysis": "<brief analysis>",
    "key_indicators": ["indicator1", "indicator2"]
}}"""

        # Initialize LLM Chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"signal-{request.coin_id}-{datetime.now(timezone.utc).timestamp()}",
            system_message="You are an expert cryptocurrency trader and technical analyst. Provide accurate, actionable trading signals based on market data. Always respond with valid JSON."
        ).with_model("openai", "gpt-5.2")
        
        # Send message and get response
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
        if json_match:
            ai_signal = json.loads(json_match.group())
        else:
            # Fallback parsing
            ai_signal = {
                "signal_type": "HOLD",
                "confidence": "MEDIUM",
                "entry_price": request.current_price,
                "take_profit": request.current_price * 1.05,
                "stop_loss": request.current_price * 0.95,
                "analysis": response[:200],
                "key_indicators": ["Volume", "Price Action"]
            }
        
        # Create and store signal
        signal = TradeSignal(
            coin_id=request.coin_id,
            symbol=request.symbol,
            signal_type=ai_signal.get('signal_type', 'HOLD'),
            confidence=ai_signal.get('confidence', 'MEDIUM'),
            entry_price=ai_signal.get('entry_price', request.current_price),
            take_profit=ai_signal.get('take_profit'),
            stop_loss=ai_signal.get('stop_loss'),
            analysis=ai_signal.get('analysis', ''),
            indicators={
                "key_indicators": ai_signal.get('key_indicators', []),
                "timeframe": request.timeframe,
                "active_toggles": request.indicators
            }
        )
        
        # Store signal in database
        signal_doc = signal.model_dump()
        await db.trade_signals.insert_one(signal_doc)
        
        return signal
        
    except Exception as e:
        logger.error(f"Error generating signal: {e}")
        # Return a fallback signal on error
        return TradeSignal(
            coin_id=request.coin_id,
            symbol=request.symbol,
            signal_type="HOLD",
            confidence="LOW",
            entry_price=request.current_price,
            take_profit=request.current_price * 1.03,
            stop_loss=request.current_price * 0.97,
            analysis=f"Unable to generate AI analysis. Market showing neutral conditions. Error: {str(e)[:100]}",
            indicators={"error": True, "timeframe": request.timeframe}
        )

@api_router.get("/signals/history")
async def get_signal_history(coin_id: Optional[str] = None, limit: int = 20):
    """Get historical trade signals"""
    try:
        query = {"coin_id": coin_id} if coin_id else {}
        signals = await db.trade_signals.find(
            query, 
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"signals": signals, "count": len(signals)}
    except Exception as e:
        logger.error(f"Error fetching signal history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MARKET INTELLIGENCE ====================

@api_router.get("/intelligence/overview")
async def get_market_intelligence():
    """Get market intelligence overview including simulated funding rates and OI"""
    try:
        # Fetch global data
        global_data = await fetch_coingecko("/global", cache_key="global_intelligence")
        gd = global_data.get('data', {})
        
        # Fetch BTC and ETH for dominance
        btc_eth = await fetch_coingecko("/coins/markets", {
            "vs_currency": "usd",
            "ids": "bitcoin,ethereum",
            "order": "market_cap_desc"
        }, cache_key="btc_eth_intelligence")
        
        # Simulate funding rates and open interest (these would come from futures exchanges)
        import random
        
        funding_rates = {
            "BTC": round(random.uniform(-0.01, 0.03), 4),
            "ETH": round(random.uniform(-0.01, 0.03), 4),
            "SOL": round(random.uniform(-0.02, 0.04), 4)
        }
        
        open_interest = {
            "BTC": round(random.uniform(15, 25) * 1e9, 0),  # ~15-25B
            "ETH": round(random.uniform(8, 15) * 1e9, 0),   # ~8-15B
            "total": round(random.uniform(35, 55) * 1e9, 0) # ~35-55B
        }
        
        return {
            "global": {
                "total_market_cap": gd.get('total_market_cap', {}).get('usd', 0),
                "total_volume_24h": gd.get('total_volume', {}).get('usd', 0),
                "market_cap_change_24h": gd.get('market_cap_change_percentage_24h_usd', 0),
                "btc_dominance": gd.get('market_cap_percentage', {}).get('btc', 0),
                "eth_dominance": gd.get('market_cap_percentage', {}).get('eth', 0)
            },
            "btc": btc_eth[0] if btc_eth else {},
            "eth": btc_eth[1] if len(btc_eth) > 1 else {},
            "funding_rates": funding_rates,
            "open_interest": open_interest,
            "market_sentiment": "bullish" if gd.get('market_cap_change_percentage_24h_usd', 0) > 0 else "bearish",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching market intelligence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/news")
async def get_crypto_news():
    """Get simulated crypto news feed (placeholder - would integrate with news API)"""
    # Simulated news items - in production, integrate with CryptoCompare or similar
    news_items = [
        {
            "id": "1",
            "title": "Bitcoin Approaches Key Resistance Level",
            "description": "BTC tests critical $100K psychological level as institutional buying continues",
            "source": "CryptoNews",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": "bullish"
        },
        {
            "id": "2", 
            "title": "Ethereum ETF Volumes Surge",
            "description": "Spot ETH ETFs see record inflows as institutional interest grows",
            "source": "BlockchainDaily",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": "bullish"
        },
        {
            "id": "3",
            "title": "Fed Rate Decision Impact on Crypto Markets",
            "description": "Analysts predict volatility ahead of upcoming Federal Reserve meeting",
            "source": "MarketWatch",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": "neutral"
        },
        {
            "id": "4",
            "title": "Solana DeFi TVL Hits New ATH",
            "description": "Total value locked in Solana ecosystem reaches record high",
            "source": "DeFiPulse",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": "bullish"
        },
        {
            "id": "5",
            "title": "Whale Alert: Large BTC Transfer Detected",
            "description": "10,000 BTC moved from exchange to unknown wallet",
            "source": "WhaleAlert",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": "neutral"
        }
    ]
    
    return {"news": news_items, "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
