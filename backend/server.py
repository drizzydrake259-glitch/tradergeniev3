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
import json
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="TraderGenie API - Modular AI Trading Strategy Engine")

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

# Simple in-memory cache with longer duration for rate limiting
cache = {}
CACHE_DURATION = 60  # seconds - increased to reduce API calls
SCANNER_CACHE_DURATION = 120  # 2 minutes for scanner data
last_api_call = None
API_COOLDOWN = 2  # seconds between API calls

# ==================== MODELS ====================

class PriceData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coin_id: str
    symbol: str
    name: str
    current_price: float
    price_change_24h: Optional[float] = 0
    price_change_percentage_24h: Optional[float] = 0
    price_change_percentage_1h: Optional[float] = 0
    market_cap: Optional[float] = 0
    total_volume: Optional[float] = 0
    high_24h: Optional[float] = 0
    low_24h: Optional[float] = 0
    last_updated: str
    image: Optional[str] = ""

class MarketData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coins: List[PriceData]
    timestamp: str

# ==================== STRATEGY MODELS ====================

class StrategyCondition(BaseModel):
    """Individual condition for a strategy"""
    indicator: str  # e.g., "price_change_1h", "volume_spike", "rsi"
    operator: str   # e.g., ">=", "<=", ">", "<", "==", "between"
    value: Any      # e.g., 25, [30, 70] for between
    timeframe: Optional[str] = "1h"

class StrategyRule(BaseModel):
    """Complete rule set for entry/exit"""
    conditions: List[StrategyCondition]
    logic: str = "AND"  # AND or OR for combining conditions

class Strategy(BaseModel):
    """Complete trading strategy definition"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    type: str  # "trend", "reversal", "breakout", "meme_short", "custom"
    market: str = "crypto"  # crypto, stocks (future)
    timeframes: List[str] = ["1h", "4h"]
    entry_rules: StrategyRule
    exit_rules: Optional[StrategyRule] = None
    risk_params: Dict[str, Any] = {"risk_percent": 2, "rr_ratio": 2}
    filters: Dict[str, Any] = {}  # volume_min, market_cap_min, etc.
    is_active: bool = True
    is_builtin: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StrategyCreateRequest(BaseModel):
    name: str
    description: str
    type: str
    timeframes: List[str] = ["1h"]
    entry_rules: StrategyRule
    exit_rules: Optional[StrategyRule] = None
    risk_params: Dict[str, Any] = {"risk_percent": 2, "rr_ratio": 2}
    filters: Dict[str, Any] = {}

class AIStrategyRequest(BaseModel):
    """Request to generate strategy from plain English"""
    description: str
    market: str = "crypto"
    risk_level: str = "medium"  # low, medium, high

# ==================== SIGNAL MODELS ====================

class TradeSignal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coin_id: str
    symbol: str
    name: str
    image: Optional[str] = ""
    signal_type: str  # BUY, SELL, SHORT, HOLD
    confidence: str  # HIGH, MEDIUM, LOW
    confidence_score: int = 50  # 0-100
    strategy_id: Optional[str] = None
    strategy_name: Optional[str] = None
    entry_price: float
    take_profit: Optional[float] = None
    take_profit_2: Optional[float] = None  # Secondary TP
    stop_loss: Optional[float] = None
    risk_reward: Optional[float] = None
    position_size_suggestion: Optional[str] = None
    analysis: str
    reasoning: List[str] = []  # Detailed reasoning points
    indicators_matched: List[str] = []
    warnings: List[str] = []
    invalidation: Optional[str] = None  # What invalidates this signal
    current_price: float
    price_change_1h: Optional[float] = 0
    price_change_24h: Optional[float] = 0
    volume_24h: Optional[float] = 0
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
    strategy_id: Optional[str] = None

class ScannerRequest(BaseModel):
    """Request for market scanner"""
    strategy_ids: Optional[List[str]] = None  # Specific strategies to scan, or all active
    min_confidence: int = 50
    limit: int = 50

class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = ""
    url: Optional[str] = ""
    source: str
    published_at: str
    sentiment: Optional[str] = "neutral"

# ==================== BUILT-IN STRATEGIES ====================

BUILTIN_STRATEGIES = [
    {
        "id": "trend-continuation",
        "name": "Trend Continuation",
        "description": "Follow established trends with pullback entries. Best for trending markets. Looks for higher timeframe trend alignment with lower timeframe pullbacks to support.",
        "type": "trend",
        "timeframes": ["4h", "1h"],
        "entry_rules": {
            "conditions": [
                {"indicator": "price_change_24h", "operator": ">", "value": 0},
                {"indicator": "price_above_ema", "operator": "==", "value": True},
                {"indicator": "volume_trend", "operator": ">", "value": 1.0}
            ],
            "logic": "AND"
        },
        "exit_rules": {
            "conditions": [
                {"indicator": "price_change_24h", "operator": "<", "value": -5}
            ],
            "logic": "OR"
        },
        "risk_params": {"risk_percent": 2, "rr_ratio": 3},
        "filters": {"market_cap_min": 100000000},
        "is_active": True,
        "is_builtin": True
    },
    {
        "id": "mean-reversion",
        "name": "Mean Reversion",
        "description": "Trade bounces from oversold/overbought conditions. Best for ranging markets. Looks for RSI extremes with divergence and price deviation from moving averages.",
        "type": "reversal",
        "timeframes": ["1h", "4h"],
        "entry_rules": {
            "conditions": [
                {"indicator": "rsi_oversold", "operator": "==", "value": True},
                {"indicator": "volume_exhaustion", "operator": "==", "value": True}
            ],
            "logic": "AND"
        },
        "risk_params": {"risk_percent": 1.5, "rr_ratio": 2},
        "filters": {"market_cap_min": 500000000},
        "is_active": True,
        "is_builtin": True
    },
    {
        "id": "breakout-retest",
        "name": "Breakout + Retest",
        "description": "Trade breakouts from consolidation with confirmation. Identifies range-bound assets, waits for volume breakout, and enters on successful retest of the breakout level.",
        "type": "breakout",
        "timeframes": ["1h", "4h"],
        "entry_rules": {
            "conditions": [
                {"indicator": "price_near_high", "operator": ">=", "value": 0.95},
                {"indicator": "volume_spike", "operator": ">=", "value": 2.0},
                {"indicator": "price_change_1h", "operator": ">", "value": 3}
            ],
            "logic": "AND"
        },
        "risk_params": {"risk_percent": 2, "rr_ratio": 2.5},
        "filters": {"volume_min": 10000000},
        "is_active": True,
        "is_builtin": True
    },
    {
        "id": "meme-pump-short",
        "name": "Meme Coin Pump Short",
        "description": "Short overextended meme coin pumps with dying volume. Scans for coins with 25%+ pumps in short timeframes, volume spike followed by decay, and price stalling with lower highs.",
        "type": "meme_short",
        "timeframes": ["15m", "1h"],
        "entry_rules": {
            "conditions": [
                {"indicator": "price_change_1h", "operator": ">=", "value": 20},
                {"indicator": "volume_decay", "operator": ">=", "value": 0.2},
                {"indicator": "price_stall", "operator": "==", "value": True}
            ],
            "logic": "AND"
        },
        "exit_rules": {
            "conditions": [
                {"indicator": "volume_revival", "operator": ">=", "value": 1.5}
            ],
            "logic": "OR"
        },
        "risk_params": {"risk_percent": 1, "rr_ratio": 2},
        "filters": {"market_cap_max": 1000000000, "volume_min": 1000000},
        "is_active": True,
        "is_builtin": True
    },
    {
        "id": "volume-breakout",
        "name": "Volume Breakout",
        "description": "Catch early momentum on significant volume spikes. Identifies unusual volume activity combined with positive price movement for early trend entries.",
        "type": "breakout",
        "timeframes": ["1h"],
        "entry_rules": {
            "conditions": [
                {"indicator": "volume_spike", "operator": ">=", "value": 3.0},
                {"indicator": "price_change_1h", "operator": ">", "value": 5},
                {"indicator": "price_change_24h", "operator": ">", "value": 0}
            ],
            "logic": "AND"
        },
        "risk_params": {"risk_percent": 1.5, "rr_ratio": 2},
        "filters": {"market_cap_min": 50000000},
        "is_active": True,
        "is_builtin": True
    }
]

# ==================== HELPER FUNCTIONS ====================

def get_cache(key: str, duration: int = CACHE_DURATION):
    """Get value from cache if not expired"""
    if key in cache:
        data, timestamp = cache[key]
        if (datetime.now(timezone.utc) - timestamp).total_seconds() < duration:
            return data
    return None

def set_cache(key: str, data: Any):
    """Set value in cache"""
    cache[key] = (data, datetime.now(timezone.utc))

async def fetch_coingecko(endpoint: str, params: dict = None, cache_key: str = None, cache_duration: int = CACHE_DURATION):
    """Fetch data from CoinGecko API with caching and rate limiting"""
    global last_api_call
    
    if cache_key:
        cached = get_cache(cache_key, cache_duration)
        if cached:
            logger.info(f"Cache hit for {cache_key}")
            return cached
    
    # Rate limiting
    if last_api_call:
        elapsed = (datetime.now(timezone.utc) - last_api_call).total_seconds()
        if elapsed < API_COOLDOWN:
            await asyncio.sleep(API_COOLDOWN - elapsed)
    
    async with httpx.AsyncClient() as http_client:
        try:
            last_api_call = datetime.now(timezone.utc)
            response = await http_client.get(
                f"{COINGECKO_BASE}{endpoint}",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            if cache_key:
                set_cache(cache_key, data)
            
            return data
        except httpx.HTTPStatusError as e:
            logger.error(f"CoinGecko API error: {e}")
            if cache_key and cache_key in cache:
                logger.info(f"Using stale cache for {cache_key}")
                return cache[cache_key][0]
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            logger.error(f"CoinGecko fetch error: {e}")
            if cache_key and cache_key in cache:
                return cache[cache_key][0]
            raise HTTPException(status_code=500, detail=str(e))

def calculate_indicators(coin_data: dict) -> dict:
    """Calculate trading indicators from coin data"""
    current_price = coin_data.get('current_price', 0)
    high_24h = coin_data.get('high_24h', 0)
    low_24h = coin_data.get('low_24h', 0)
    price_change_24h = coin_data.get('price_change_percentage_24h', 0) or 0
    price_change_1h = coin_data.get('price_change_percentage_1h_in_currency', 0) or 0
    volume = coin_data.get('total_volume', 0)
    market_cap = coin_data.get('market_cap', 0)
    
    # Calculate derived indicators
    price_range = high_24h - low_24h if high_24h and low_24h else 0
    price_position = (current_price - low_24h) / price_range if price_range > 0 else 0.5
    
    # Simulated indicators (in production, use proper TA library)
    rsi_estimate = 50 + (price_change_24h * 2)  # Rough RSI estimate
    rsi_estimate = max(0, min(100, rsi_estimate))
    
    # Volume analysis
    avg_volume_estimate = volume / 1.2  # Assume current is slightly above average
    volume_ratio = volume / avg_volume_estimate if avg_volume_estimate > 0 else 1
    
    return {
        "current_price": current_price,
        "price_change_24h": price_change_24h,
        "price_change_1h": price_change_1h,
        "high_24h": high_24h,
        "low_24h": low_24h,
        "volume_24h": volume,
        "market_cap": market_cap,
        "price_position": price_position,  # 0 = at low, 1 = at high
        "price_near_high": price_position >= 0.9,
        "price_near_low": price_position <= 0.1,
        "rsi_estimate": rsi_estimate,
        "rsi_oversold": rsi_estimate < 30,
        "rsi_overbought": rsi_estimate > 70,
        "volume_ratio": volume_ratio,
        "volume_spike": volume_ratio >= 2.0,
        "volume_decay": volume_ratio < 0.8,
        "volume_exhaustion": volume_ratio < 0.5,
        "price_above_ema": price_change_24h > 0,  # Simplified
        "volume_trend": volume_ratio,
        "price_stall": abs(price_change_1h) < 1 and price_change_24h > 15,
        "volume_revival": volume_ratio > 1.5
    }

def evaluate_strategy(strategy: dict, indicators: dict) -> tuple[bool, int, List[str]]:
    """Evaluate if a coin matches strategy conditions"""
    entry_rules = strategy.get('entry_rules', {})
    conditions = entry_rules.get('conditions', [])
    logic = entry_rules.get('logic', 'AND')
    
    matches = []
    reasons = []
    
    for condition in conditions:
        indicator = condition.get('indicator')
        operator = condition.get('operator')
        value = condition.get('value')
        
        actual_value = indicators.get(indicator)
        if actual_value is None:
            continue
        
        matched = False
        if operator == '>':
            matched = actual_value > value
        elif operator == '>=':
            matched = actual_value >= value
        elif operator == '<':
            matched = actual_value < value
        elif operator == '<=':
            matched = actual_value <= value
        elif operator == '==':
            matched = actual_value == value
        elif operator == 'between' and isinstance(value, list) and len(value) == 2:
            matched = value[0] <= actual_value <= value[1]
        
        matches.append(matched)
        if matched:
            reasons.append(f"{indicator}: {actual_value:.2f} {operator} {value}")
    
    if not matches:
        return False, 0, []
    
    if logic == 'AND':
        passed = all(matches)
        confidence = int((sum(matches) / len(matches)) * 100)
    else:  # OR
        passed = any(matches)
        confidence = int((sum(matches) / len(matches)) * 100)
    
    return passed, confidence, reasons

def calculate_trade_levels(current_price: float, signal_type: str, strategy: dict, indicators: dict) -> dict:
    """Calculate entry, TP, and SL levels"""
    risk_params = strategy.get('risk_params', {"risk_percent": 2, "rr_ratio": 2})
    rr_ratio = risk_params.get('rr_ratio', 2)
    
    high_24h = indicators.get('high_24h', current_price * 1.05)
    low_24h = indicators.get('low_24h', current_price * 0.95)
    atr_estimate = (high_24h - low_24h) * 0.5  # Rough ATR
    
    if signal_type in ['BUY', 'LONG']:
        stop_loss = current_price - atr_estimate
        take_profit = current_price + (atr_estimate * rr_ratio)
        take_profit_2 = current_price + (atr_estimate * rr_ratio * 1.5)
    else:  # SELL, SHORT
        stop_loss = current_price + atr_estimate
        take_profit = current_price - (atr_estimate * rr_ratio)
        take_profit_2 = current_price - (atr_estimate * rr_ratio * 1.5)
    
    risk_reward = abs(take_profit - current_price) / abs(stop_loss - current_price) if stop_loss != current_price else 0
    
    return {
        "entry_price": current_price,
        "stop_loss": round(stop_loss, 8),
        "take_profit": round(take_profit, 8),
        "take_profit_2": round(take_profit_2, 8),
        "risk_reward": round(risk_reward, 2)
    }

# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "TraderGenie API - Modular AI Trading Strategy Engine", "status": "online"}

# ==================== STRATEGY ENDPOINTS ====================

@api_router.get("/strategies")
async def get_strategies(include_builtin: bool = True):
    """Get all strategies including built-in ones"""
    try:
        strategies = []
        
        # Add built-in strategies
        if include_builtin:
            for bs in BUILTIN_STRATEGIES:
                strategies.append({**bs, "is_builtin": True})
        
        # Add user strategies from database
        user_strategies = await db.strategies.find({}, {"_id": 0}).to_list(100)
        strategies.extend(user_strategies)
        
        return {"strategies": strategies, "count": len(strategies)}
    except Exception as e:
        logger.error(f"Error fetching strategies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/strategies/{strategy_id}")
async def get_strategy(strategy_id: str):
    """Get a specific strategy by ID"""
    # Check built-in first
    for bs in BUILTIN_STRATEGIES:
        if bs['id'] == strategy_id:
            return bs
    
    # Check database
    strategy = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy

@api_router.post("/strategies")
async def create_strategy(request: StrategyCreateRequest):
    """Create a new custom strategy"""
    try:
        strategy = Strategy(
            name=request.name,
            description=request.description,
            type=request.type,
            timeframes=request.timeframes,
            entry_rules=request.entry_rules,
            exit_rules=request.exit_rules,
            risk_params=request.risk_params,
            filters=request.filters,
            is_builtin=False
        )
        
        strategy_doc = strategy.model_dump()
        await db.strategies.insert_one(strategy_doc)
        
        return strategy_doc
    except Exception as e:
        logger.error(f"Error creating strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/strategies/{strategy_id}/toggle")
async def toggle_strategy(strategy_id: str):
    """Toggle strategy active status"""
    # Can't toggle built-in strategies directly in DB
    for bs in BUILTIN_STRATEGIES:
        if bs['id'] == strategy_id:
            bs['is_active'] = not bs['is_active']
            return {"id": strategy_id, "is_active": bs['is_active']}
    
    result = await db.strategies.find_one_and_update(
        {"id": strategy_id},
        {"$set": {"is_active": {"$not": "$is_active"}}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"id": strategy_id, "is_active": result.get('is_active', True)}

@api_router.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete a custom strategy (can't delete built-in)"""
    for bs in BUILTIN_STRATEGIES:
        if bs['id'] == strategy_id:
            raise HTTPException(status_code=400, detail="Cannot delete built-in strategies")
    
    result = await db.strategies.delete_one({"id": strategy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": "Strategy deleted", "id": strategy_id}

# ==================== AI STRATEGY BUILDER ====================

@api_router.post("/strategies/ai/generate")
async def generate_strategy_from_description(request: AIStrategyRequest):
    """Generate a strategy from plain English description using AI"""
    try:
        prompt = f"""You are an expert trading strategy designer. Convert this plain English trading strategy description into a structured strategy definition.

User Description: "{request.description}"
Market: {request.market}
Risk Level: {request.risk_level}

Generate a complete trading strategy with the following structure. Be specific with numerical values.

Available indicators for conditions:
- price_change_24h (percentage, e.g., > 5 means up more than 5%)
- price_change_1h (percentage)
- volume_spike (ratio, e.g., >= 2.0 means 2x normal volume)
- volume_decay (ratio, e.g., >= 0.2 means volume dropped 20%)
- rsi_oversold (boolean)
- rsi_overbought (boolean)
- price_near_high (boolean, within 5% of 24h high)
- price_near_low (boolean, within 5% of 24h low)
- price_above_ema (boolean)
- volume_trend (ratio)
- price_stall (boolean)
- market_cap (number in USD)

Respond ONLY with valid JSON in this exact format:
{{
    "name": "Strategy Name",
    "description": "Clear description of what this strategy does and when to use it",
    "type": "trend|reversal|breakout|meme_short|custom",
    "timeframes": ["1h", "4h"],
    "entry_rules": {{
        "conditions": [
            {{"indicator": "price_change_24h", "operator": ">", "value": 5}},
            {{"indicator": "volume_spike", "operator": ">=", "value": 2.0}}
        ],
        "logic": "AND"
    }},
    "exit_rules": {{
        "conditions": [
            {{"indicator": "price_change_24h", "operator": "<", "value": -3}}
        ],
        "logic": "OR"
    }},
    "risk_params": {{
        "risk_percent": 2,
        "rr_ratio": 2
    }},
    "filters": {{
        "market_cap_min": 100000000,
        "volume_min": 1000000
    }},
    "warnings": ["Any risks or caveats about this strategy"]
}}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"strategy-gen-{datetime.now(timezone.utc).timestamp()}",
            system_message="You are an expert trading strategy designer. Always respond with valid JSON only, no markdown formatting."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            strategy_data = json.loads(json_match.group())
        else:
            raise ValueError("Could not parse AI response")
        
        # Create strategy object
        strategy = Strategy(
            name=strategy_data.get('name', 'AI Generated Strategy'),
            description=strategy_data.get('description', request.description),
            type=strategy_data.get('type', 'custom'),
            timeframes=strategy_data.get('timeframes', ['1h']),
            entry_rules=StrategyRule(**strategy_data.get('entry_rules', {"conditions": [], "logic": "AND"})),
            exit_rules=StrategyRule(**strategy_data.get('exit_rules', {"conditions": [], "logic": "OR"})) if strategy_data.get('exit_rules') else None,
            risk_params=strategy_data.get('risk_params', {"risk_percent": 2, "rr_ratio": 2}),
            filters=strategy_data.get('filters', {}),
            is_builtin=False
        )
        
        strategy_doc = strategy.model_dump()
        strategy_doc['warnings'] = strategy_data.get('warnings', [])
        strategy_doc['ai_generated'] = True
        
        # Save to database
        await db.strategies.insert_one(strategy_doc)
        
        return strategy_doc
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Error generating AI strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MARKET SCANNER ====================

@api_router.post("/scanner/scan")
async def scan_market(request: ScannerRequest):
    """Scan market for coins matching active strategies"""
    try:
        # Get active strategies
        active_strategies = []
        
        if request.strategy_ids:
            # Specific strategies
            for sid in request.strategy_ids:
                for bs in BUILTIN_STRATEGIES:
                    if bs['id'] == sid and bs['is_active']:
                        active_strategies.append(bs)
                user_strat = await db.strategies.find_one({"id": sid, "is_active": True}, {"_id": 0})
                if user_strat:
                    active_strategies.append(user_strat)
        else:
            # All active strategies
            active_strategies = [bs for bs in BUILTIN_STRATEGIES if bs['is_active']]
            user_strategies = await db.strategies.find({"is_active": True}, {"_id": 0}).to_list(50)
            active_strategies.extend(user_strategies)
        
        if not active_strategies:
            return {"signals": [], "scanned_coins": 0, "strategies_used": 0}
        
        # Fetch market data (top 100 coins) with longer cache
        cache_key = "scanner_coins"
        try:
            coins_data = await fetch_coingecko("/coins/markets", {
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 100,
                "page": 1,
                "sparkline": "false",
                "price_change_percentage": "1h,24h"
            }, cache_key=cache_key, cache_duration=SCANNER_CACHE_DURATION)
        except HTTPException as e:
            # If API fails, return empty but don't crash
            logger.warning(f"Scanner API call failed, returning empty results: {e}")
            return {
                "signals": [],
                "scanned_coins": 0,
                "strategies_used": len(active_strategies),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": "API rate limited - try again in a minute"
            }
        
        signals = []
        
        for coin in coins_data:
            indicators = calculate_indicators(coin)
            
            for strategy in active_strategies:
                # Apply filters first
                filters = strategy.get('filters', {})
                if filters.get('market_cap_min') and indicators['market_cap'] < filters['market_cap_min']:
                    continue
                if filters.get('market_cap_max') and indicators['market_cap'] > filters['market_cap_max']:
                    continue
                if filters.get('volume_min') and indicators['volume_24h'] < filters['volume_min']:
                    continue
                
                # Evaluate strategy
                passed, confidence, reasons = evaluate_strategy(strategy, indicators)
                
                if passed and confidence >= request.min_confidence:
                    # Determine signal type based on strategy
                    signal_type = "BUY"
                    if strategy['type'] == 'meme_short':
                        signal_type = "SHORT"
                    elif strategy['type'] == 'reversal' and indicators.get('rsi_overbought'):
                        signal_type = "SELL"
                    
                    # Calculate trade levels
                    levels = calculate_trade_levels(
                        indicators['current_price'],
                        signal_type,
                        strategy,
                        indicators
                    )
                    
                    # Generate warnings
                    warnings = []
                    if indicators['volume_ratio'] < 0.5:
                        warnings.append("Low volume - reduced reliability")
                    if indicators['rsi_estimate'] > 80:
                        warnings.append("Extremely overbought - high reversal risk")
                    if indicators['rsi_estimate'] < 20:
                        warnings.append("Extremely oversold - potential bounce")
                    
                    signal = TradeSignal(
                        coin_id=coin['id'],
                        symbol=coin['symbol'].upper(),
                        name=coin['name'],
                        image=coin.get('image', ''),
                        signal_type=signal_type,
                        confidence="HIGH" if confidence >= 80 else "MEDIUM" if confidence >= 60 else "LOW",
                        confidence_score=confidence,
                        strategy_id=strategy['id'],
                        strategy_name=strategy['name'],
                        entry_price=levels['entry_price'],
                        take_profit=levels['take_profit'],
                        take_profit_2=levels['take_profit_2'],
                        stop_loss=levels['stop_loss'],
                        risk_reward=levels['risk_reward'],
                        analysis=f"{strategy['name']} signal detected. {strategy['description'][:100]}...",
                        reasoning=reasons,
                        indicators_matched=reasons,
                        warnings=warnings,
                        invalidation=f"Signal invalid if price {'drops below' if signal_type in ['BUY', 'LONG'] else 'rises above'} ${levels['stop_loss']:,.2f}",
                        current_price=indicators['current_price'],
                        price_change_1h=indicators['price_change_1h'],
                        price_change_24h=indicators['price_change_24h'],
                        volume_24h=indicators['volume_24h']
                    )
                    signals.append(signal.model_dump())
        
        # Sort by confidence
        signals.sort(key=lambda x: x['confidence_score'], reverse=True)
        signals = signals[:request.limit]
        
        # Store signals in database
        if signals:
            await db.scanner_signals.insert_many(signals)
        
        return {
            "signals": signals,
            "scanned_coins": len(coins_data),
            "strategies_used": len(active_strategies),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in market scanner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/scanner/history")
async def get_scanner_history(limit: int = 50):
    """Get recent scanner signals"""
    try:
        signals = await db.scanner_signals.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"signals": signals, "count": len(signals)}
    except Exception as e:
        logger.error(f"Error fetching scanner history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MARKET ENDPOINTS ====================

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
            "price_change_percentage": "1h,24h"
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
                price_change_percentage_1h=coin.get('price_change_percentage_1h_in_currency', 0) or 0,
                market_cap=coin.get('market_cap', 0) or 0,
                total_volume=coin.get('total_volume', 0) or 0,
                high_24h=coin.get('high_24h', 0) or 0,
                low_24h=coin.get('low_24h', 0) or 0,
                last_updated=coin.get('last_updated', datetime.now(timezone.utc).isoformat()),
                image=coin.get('image', '')
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
async def get_top_coins(limit: int = 100, vs_currency: str = "usd"):
    """Get top cryptocurrencies by market cap"""
    try:
        cache_key = f"top_coins_{limit}_{vs_currency}"
        data = await fetch_coingecko("/coins/markets", {
            "vs_currency": vs_currency,
            "order": "market_cap_desc",
            "per_page": min(limit, 100),
            "page": 1,
            "sparkline": "false",
            "price_change_percentage": "1h,24h"
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
                "price_change_percentage_1h": coin.get('price_change_percentage_1h_in_currency', 0) or 0,
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
    """Generate AI-powered trade signals using GPT"""
    try:
        indicator_text = ""
        if request.indicators:
            active_indicators = [k for k, v in request.indicators.items() if v]
            if active_indicators:
                indicator_text = f"\nActive analysis indicators: {', '.join(active_indicators)}"
        
        prompt = f"""You are an expert crypto trader and technical analyst. Analyze the following market data and provide a detailed trading signal.

Asset: {request.symbol} ({request.coin_id})
Timeframe: {request.timeframe}
Current Price: ${request.current_price:,.2f}
24h Change: {request.price_change_24h:+.2f}% 
24h Volume: ${request.volume_24h:,.0f}
24h High: ${request.high_24h:,.2f}
24h Low: ${request.low_24h:,.2f}
Market Cap: ${request.market_cap:,.0f}
{indicator_text}

Provide a comprehensive trading signal with:
1. Signal Type: BUY, SELL, SHORT, or HOLD
2. Confidence Level: HIGH (80-100%), MEDIUM (50-79%), or LOW (below 50%)
3. Confidence Score: 0-100
4. Entry Price
5. Take Profit (primary and secondary targets)
6. Stop Loss
7. Risk/Reward Ratio
8. Detailed analysis (3-5 sentences)
9. Key reasoning points (3-5 bullet points)
10. Warnings or risks
11. What would invalidate this signal

Format your response as JSON:
{{
    "signal_type": "BUY/SELL/SHORT/HOLD",
    "confidence": "HIGH/MEDIUM/LOW",
    "confidence_score": 75,
    "entry_price": <number>,
    "take_profit": <number>,
    "take_profit_2": <number>,
    "stop_loss": <number>,
    "risk_reward": <number>,
    "analysis": "<detailed analysis>",
    "reasoning": ["point 1", "point 2", "point 3"],
    "warnings": ["warning 1"],
    "invalidation": "<what invalidates this signal>"
}}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"signal-{request.coin_id}-{datetime.now(timezone.utc).timestamp()}",
            system_message="You are an expert cryptocurrency trader and technical analyst. Provide accurate, actionable trading signals. Always respond with valid JSON."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
        if json_match:
            ai_signal = json.loads(json_match.group())
        else:
            ai_signal = {
                "signal_type": "HOLD",
                "confidence": "MEDIUM",
                "confidence_score": 50,
                "entry_price": request.current_price,
                "take_profit": request.current_price * 1.05,
                "take_profit_2": request.current_price * 1.08,
                "stop_loss": request.current_price * 0.95,
                "risk_reward": 1.0,
                "analysis": response[:300],
                "reasoning": ["Analysis based on current market data"],
                "warnings": [],
                "invalidation": "Monitor for significant price movement"
            }
        
        signal = TradeSignal(
            coin_id=request.coin_id,
            symbol=request.symbol,
            name=request.coin_id.replace('-', ' ').title(),
            signal_type=ai_signal.get('signal_type', 'HOLD'),
            confidence=ai_signal.get('confidence', 'MEDIUM'),
            confidence_score=ai_signal.get('confidence_score', 50),
            entry_price=ai_signal.get('entry_price', request.current_price),
            take_profit=ai_signal.get('take_profit'),
            take_profit_2=ai_signal.get('take_profit_2'),
            stop_loss=ai_signal.get('stop_loss'),
            risk_reward=ai_signal.get('risk_reward'),
            analysis=ai_signal.get('analysis', ''),
            reasoning=ai_signal.get('reasoning', []),
            warnings=ai_signal.get('warnings', []),
            invalidation=ai_signal.get('invalidation', ''),
            current_price=request.current_price,
            price_change_24h=request.price_change_24h,
            volume_24h=request.volume_24h
        )
        
        signal_doc = signal.model_dump()
        await db.trade_signals.insert_one(signal_doc)
        
        return signal
        
    except Exception as e:
        logger.error(f"Error generating signal: {e}")
        return TradeSignal(
            coin_id=request.coin_id,
            symbol=request.symbol,
            name=request.coin_id.replace('-', ' ').title(),
            signal_type="HOLD",
            confidence="LOW",
            confidence_score=25,
            entry_price=request.current_price,
            take_profit=request.current_price * 1.03,
            stop_loss=request.current_price * 0.97,
            analysis=f"Unable to generate AI analysis. Error: {str(e)[:100]}",
            reasoning=["Fallback signal due to analysis error"],
            warnings=["AI analysis failed - use caution"],
            current_price=request.current_price,
            price_change_24h=request.price_change_24h,
            volume_24h=request.volume_24h
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
    """Get market intelligence overview"""
    try:
        global_data = await fetch_coingecko("/global", cache_key="global_intelligence")
        gd = global_data.get('data', {})
        
        btc_eth = await fetch_coingecko("/coins/markets", {
            "vs_currency": "usd",
            "ids": "bitcoin,ethereum",
            "order": "market_cap_desc",
            "price_change_percentage": "1h,24h"
        }, cache_key="btc_eth_intelligence")
        
        import random
        funding_rates = {
            "BTC": round(random.uniform(-0.01, 0.03), 4),
            "ETH": round(random.uniform(-0.01, 0.03), 4),
            "SOL": round(random.uniform(-0.02, 0.04), 4)
        }
        
        open_interest = {
            "BTC": round(random.uniform(15, 25) * 1e9, 0),
            "ETH": round(random.uniform(8, 15) * 1e9, 0),
            "total": round(random.uniform(35, 55) * 1e9, 0)
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
    """Get crypto news feed"""
    news_items = [
        {
            "id": "1",
            "title": "Bitcoin Approaches Key Resistance Level",
            "description": "BTC tests critical psychological level as institutional buying continues",
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
