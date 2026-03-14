from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import redis
import os
import httpx
import feedparser
import random
import json
from datetime import datetime, time, timezone, timedelta
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Union, Optional


import models
import database
import auth_utils

load_dotenv()

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Investment Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "sandbox_c8r831aad3i9vba1p0a0")

MARKET_CATEGORIES = {
    "Technology": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "ADBE", "INTC", "AMD", "CRM", "ORCL", "NFLX", "PYPL", "QCOM", "TXN", "AVGO", "CSCO", "PANW", "SNOW", "PLTR", "MDB", "NET"],
    "Finance": ["JPM", "V", "MA", "BAC", "WFC", "C", "GS", "MS", "AXP", "BLK", "SCHW", "SQ", "COIN"],
    "Consumer": ["WMT", "PG", "HD", "DIS", "KO", "PEP", "COST", "NKE", "MCD", "SBUX", "TGT", "LULU", "TM", "RACE", "HMC"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK", "TMO", "LLY", "DHR", "GILD", "REGN", "ISRG"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "PSX", "MPC", "VLO"],
    "Industrial": ["CAT", "HON", "GE", "UPS", "FDX", "LMT", "BA", "GD"],
    "Real Estate": ["PLD", "AMT", "EQIX", "SPG", "DRE"],
    "Utilities": ["NEE", "DUK", "SO", "EXC", "AEP"],
    "Indices & ETFs": ["SPY", "QQQ", "DIA", "VOO", "VTI", "IWM", "VEA", "VWO", "ARKK", "SMH"]
}

STOCKS_LIST = [ticker for sublist in MARKET_CATEGORIES.values() for ticker in sublist]

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> models.User | None:
    """Return the current user or None if authentication fails.
    This allows unauthenticated access to public endpoints.
    """
    if not token:
        return None
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except auth_utils.JWTError:
        return None
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        return None
    return user

@app.post("/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth_utils.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = auth_utils.create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = auth_utils.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/portfolios")
def get_portfolios(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return db.query(models.Portfolio).options(joinedload(models.Portfolio.holdings)).filter(models.Portfolio.user_id == current_user.id).all()

@app.post("/portfolios")
def create_portfolio(name: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    new_portfolio = models.Portfolio(user_id=current_user.id, name=name)
    db.add(new_portfolio)
    db.commit()
    db.refresh(new_portfolio)
    return new_portfolio

@app.delete("/portfolios/{portfolio_id}")
def delete_portfolio(portfolio_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()
    return {"message": "Portfolio deleted"}

@app.post("/portfolios/{portfolio_id}/deposit")
def deposit_funds(portfolio_id: int, amount: float, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id, 
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio.balance += amount
    db.commit()
    db.refresh(portfolio)
    return portfolio

def get_market_status_info():
    now = datetime.now(timezone.utc)
    ny_now = now - timedelta(hours=4)
    is_weekend = ny_now.weekday() >= 5
    market_open = time(9, 30)
    market_close = time(16, 0)
    current_time = ny_now.time()
    is_open = not is_weekend and (market_open <= current_time <= market_close)
    return {
        "is_open": is_open,
        "ny_time": ny_now.strftime("%Y-%m-%d %H:%M:%S"),
        "reason": "Weekend" if is_weekend else ("After Hours" if not is_open else "Trading Hours")
    }

@app.get("/market/status")
def get_market_status():
    return get_market_status_info()

def get_mock_price(ticker: str):
    status = get_market_status_info()
    is_open = status["is_open"]
    if not is_open:
        seed_str = f"{ticker}_{status['ny_time'][:10]}"
        random.seed(seed_str)
    # Stable base prices from high-fidelity source (mocked truth)
    base_prices = {
        # Updated to ~March 2026 realistic levels
        "AAPL": 210.50, "NVDA": 1150.20, "MSFT": 485.40, "AMZN": 210.10,
        "GOOGL": 195.30, "META": 580.15, "TSLA": 220.05, "NFLX": 750.40,
        "AVGO": 1550.00, "COST": 880.90, "GS": 490.30, "AXP": 285.10,
        "JPM": 225.40, "V": 340.10, "UNH": 540.20, "HD": 410.10,
        "SPY": 662.30, "QQQ": 550.50, "DIA": 440.10, "VOO": 610.30,
        "VTI": 310.40, "IWM": 245.10, "ARKK": 55.20, "SMH": 310.30,
        "PANW": 385.40, "SNOW": 215.20, "PLTR": 38.50, "MDB": 460.10,
        "SQ": 95.30, "COIN": 310.10, "LULU": 520.20, "RACE": 495.40
    }
    base = base_prices.get(ticker, random.uniform(50, 200))
    
    # Check Finnhub for real data if possible
    try:
        import httpx
        with httpx.Client() as client:
            response = client.get(f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={FINNHUB_API_KEY}", timeout=1.5)
            data = response.json()
            if data.get("c"):
                return data["c"], data.get("d", 0), data.get("dp", 0)
    except:
        pass

    price = round(base + random.uniform(-base*0.01, base*0.01), 2)
    change = round(random.uniform(-base*0.015, base*0.015), 2)
    if not is_open: random.seed(None)
    percent_change = round((change/(price-change))*100, 2)
    return price, change, percent_change

@app.get("/market/stocks")
async def get_market_stocks(current_user: models.User = Depends(get_current_user, use_cache=False), db: Session = Depends(database.get_db)):
    # Allow unauthenticated access; if no user, treat as guest
    if current_user is None:
        fav_tickers = set()
    else:
        favorites = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()
        fav_tickers = {f.ticker for f in favorites}
    results = []
    # favorites logic handled above based on current_user
    for ticker in STOCKS_LIST:
        cache_key = f"market_quote_v5:{ticker}"
        cached_data = redis_client.get(cache_key)
        if cached_data:
            stock_info = json.loads(cached_data)
        else:
            price, change, percent_change = get_mock_price(ticker)
            raw_volume = random.uniform(1, 150)
            mkt_cap = random.uniform(10, 3000)
            pe = random.uniform(10, 80)
            
            # Enrich with real-ish data if possible (mocked for speed)
            stock_info = {
                "ticker": ticker,
                "name": ticker, # In a real app, mapping ticker to name
                "price": price,
                "change": change,
                "percent_change": percent_change,
                "volume": f"{raw_volume:.1f}M",
                "raw_volume": raw_volume, # For sorting
                "avg_vol_3m": f"{raw_volume * random.uniform(0.8, 1.2):.1f}M",
                "market_cap": f"{mkt_cap:.2f}B",
                "raw_market_cap": mkt_cap,
                "pe_ratio": f"{pe:.2f}",
                "raw_pe": pe,
                "yield": f"{random.uniform(0, 4):.2f}%",
                "high_24h": round(price * 1.02, 2),
                "low_24h": round(price * 0.98, 2),
                "category": next((k for k, v in MARKET_CATEGORIES.items() if ticker in v), "Other")
            }
            redis_client.setex(cache_key, 60, json.dumps(stock_info))
            
        stock_info["is_favorite"] = ticker in fav_tickers
        results.append(stock_info)
    return results

@app.get("/market/collections/{collection_id}")
async def get_market_collection(collection_id: str, current_user: models.User = Depends(get_current_user, use_cache=False), db: Session = Depends(database.get_db)):
    # Allow unauthenticated access; if no user, treat as guest
    if current_user is None:
        fav_tickers = set()
    else:
        favorites = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()
        fav_tickers = {f.ticker for f in favorites}
    stocks = await get_market_stocks(current_user, db)
    # The rest of logic uses stocks
    if collection_id == "most-active":
        return sorted(stocks, key=lambda x: x.get("raw_volume", 0), reverse=True)[:15]
    elif collection_id == "gainers":
        return sorted(stocks, key=lambda x: x.get("percent_change", 0), reverse=True)[:15]
    elif collection_id == "losers":
        return sorted(stocks, key=lambda x: x.get("percent_change", 0))[:15]
    elif collection_id == "trending":
        return random.sample(stocks, min(len(stocks), 15))
    elif collection_id == "watchlist":
        return [s for s in stocks if s.get("is_favorite")]
    else:
        raise HTTPException(status_code=404, detail="Collection not found")

@app.get("/market/categories/{category}")
async def get_category_stocks(category: str, current_user: models.User = Depends(get_current_user, use_cache=False), db: Session = Depends(database.get_db)):
    # Allow unauthenticated access; if no user, treat as guest
    stocks = await get_market_stocks(current_user, db)
    return [s for s in stocks if s.get("category").lower() == category.lower()]

@app.get("/market/news")
async def get_market_news():
    cache_key = "market_news_live"
    cached_news = redis_client.get(cache_key)
    if cached_news: return json.loads(cached_news)
    try:
        feed = feedparser.parse("https://finance.yahoo.com/news/rssindex")
        news_items = []
        for entry in feed.entries[:10]:
            tag = "MARKET"
            if hasattr(entry, 'tags') and entry.tags: tag = entry.tags[0].term.upper()
            elif hasattr(entry, 'category'): tag = entry.category.upper()
            news_items.append({
                "title": entry.title, "link": entry.link, "summary": getattr(entry, 'summary', ""),
                "published": getattr(entry, 'published', "Just now"), "tag": tag[:10]
            })
        redis_client.setex(cache_key, 300, json.dumps(news_items))
        return news_items
    except Exception:
        return [
            {"title": "Global markets react to latest economic data", "published": "2m ago", "tag": "MACRO", "link": "#"},
            {"title": "Tech sector sees renewed interest amid AI breakthroughs", "published": "15m ago", "tag": "TECH", "link": "#"},
            {"title": "Energy stocks fluctuate following supply reports", "published": "45m ago", "tag": "ENERGY", "link": "#"}
        ]

@app.get("/market/search")
async def search_stock(symbol: str, current_user: Optional[models.User] = Depends(get_current_user, use_cache=False)):
    symbol = symbol.upper()
    if symbol not in STOCKS_LIST:
        raise HTTPException(status_code=404, detail="Security not found in active index")
        
    cache_key = f"market_quote_v5:{symbol}"
    cached_data = redis_client.get(cache_key)
    if cached_data: return json.loads(cached_data)
    
    # Since we validated against STOCKS_LIST, we can just use get_market_stocks logic or mock
    stocks = await get_market_stocks(current_user=current_user)
    stock = next((s for s in stocks if s["ticker"] == symbol), None)
    if stock:
        return stock
    raise HTTPException(status_code=404, detail="Security data currently unavailable")

@app.get("/market/stocks/{ticker}/history")
async def get_stock_history(ticker: str, timeframe: str = "1D", current_user: Optional[models.User] = Depends(get_current_user, use_cache=False)):
    ticker = ticker.upper()
    if ticker not in STOCKS_LIST:
        raise HTTPException(status_code=404, detail="Security not found")
    
    # Get current quote to base history on
    price, change, pc = get_mock_price(ticker)
    
    points = []
    now = datetime.now(timezone.utc)
    
    if timeframe == "1D":
        # 15-minute intervals for the last 24 hours or market day
        # For simplicity, 15-min intervals for 24h leading to now
        count = 96 
        interval_min = 15
        volatility = 0.005
    elif timeframe == "5D":
        count = 120 # Hourly for 5 days
        interval_min = 60
        volatility = 0.01
    elif timeframe == "1M":
        count = 30 # Daily for 1 month
        interval_min = 1440
        volatility = 0.02
    elif timeframe == "6M":
        count = 180
        interval_min = 1440
        volatility = 0.04
    elif timeframe == "YTD":
        days_ytd = (now - datetime(now.year, 1, 1, tzinfo=timezone.utc)).days
        count = max(days_ytd, 1)
        interval_min = 1440
        volatility = 0.05
    elif timeframe == "1Y":
        count = 365
        interval_min = 1440
        volatility = 0.08
    elif timeframe == "5Y":
        count = 260 # Weekly approx for 5 years
        interval_min = 10080
        volatility = 0.15
    else:
        count = 100
        interval_min = 60
        volatility = 0.02

    # Deterministic seed based on ticker and timeframe to keep graph stable
    random.seed(f"{ticker}_{timeframe}_{now.strftime('%Y-%m-%d')}")
    
    # Trend factors (approx monthly/yearly returns for mock drift)
    # E.g., SPY is down ~3.5% this month
    trends = {
        "SPY": {"1M": -0.035, "6M": 0.08, "1Y": 0.15},
        "QQQ": {"1M": -0.045, "6M": 0.12, "1Y": 0.25},
        "NVDA": {"1M": 0.10, "6M": 0.60, "1Y": 1.20},
    }
    
    current_val = price
    ticker_trends = trends.get(ticker, {})
    timeframe_drift_total = ticker_trends.get(timeframe, 0.02) # Default slight positive drift
    
    # Random drift per step to reach the target total drift roughly
    # We walk backwards, so we subtract the drift
    drift_per_step = (timeframe_drift_total * price) / count

    for i in range(count):
        # Walk backwards
        ts = now - timedelta(minutes=i * interval_min)
        
        # 1D specific drift logic (aligning with 'change' for today)
        step_drift = 0
        if timeframe == "1D":
            step_drift = -(change / count)
        else:
            # Use general trend drift
            # We are walking backwards, so if the trend is +2%, we subtract a bit each step
            step_drift = -drift_per_step
        
        noise = current_val * (random.uniform(-volatility, volatility) / (count**0.5))
        current_val += step_drift + noise
        
        points.append({
            "time": ts.isoformat(),
            "price": round(max(current_val, 0.01), 2),
            "displayTime": ts.strftime("%H:%M") if timeframe == "1D" else ts.strftime("%b %d")
        })
    
    random.seed(None) # Reset seed
    return sorted(points, key=lambda x: x["time"])

@app.get("/market/stocks/{ticker}/details")
async def get_stock_details(ticker: str, current_user: Optional[models.User] = Depends(get_current_user, use_cache=False)):
    ticker = ticker.upper()
    descriptions = {
        # Technology
        "AAPL": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. Known for premium design and tight ecosystem integration, Apple's services business (iCloud, App Store) is a major growth driver alongside its iconic iPhone hardware.",
        "NVDA": "NVIDIA Corporation is the leader in visual computing and artificial intelligence. Its graphics processing units (GPUs) are essential for high-performance gaming, data centers, and the training of modern Large Language Models (LLMs) like GPT-4.",
        "GOOGL": "Alphabet Inc. is the parent company of Google, the dominant force in internet search and online advertising. Alphabet also oversees Google Cloud, YouTube, and its 'Other Bets' division focusing on autonomous vehicles (Waymo) and healthcare.",
        "MSFT": "Microsoft Corporation is a software and hardware giant, powering business productivity with Office 365 and dominating the enterprise cloud market with Azure. It also has significant footprints in gaming (Xbox) and professional networking (LinkedIn).",
        "AMZN": "Amazon.com, Inc. transformed retail via its massive e-commerce platform and powers much of the modern web through Amazon Web Services (AWS). It continues to expand into logistics, streaming media, and physical grocery retail.",
        "TSLA": "Tesla, Inc. is a vertically integrated sustainable energy company. It designs and manufactures electric vehicles (EVs), battery energy storage systems, and solar products. Tesla is also a pioneer in autonomous driving software (FSD).",
        "META": "Meta Platforms, Inc. operates the world's largest social network ecosystem, including Facebook, Instagram, WhatsApp, and Messenger. It is heavily investing in the 'Metaverse' and AI-driven content discovery.",
        "PLTR": "Palantir Technologies Inc. specializes in big data analytics. Its platforms, Foundry and Gotham, enable government agencies and large corporations to integrate disparate data sources and make complex operational decisions in real-time.",
        "SNOW": "Snowflake Inc. provides a cloud-native data platform that allows organizations to consolidate data into a single source of truth to drive meaningful business insights and complex data-driven applications.",
        
        # Finance
        "JPM": "JPMorgan Chase & Co. is a global leader in financial services, offering solutions to the world's most important corporations, governments, and institutions. It operates major segments in consumer banking, investment banking, and commercial lending.",
        "GS": "The Goldman Sachs Group, Inc. is a premier investment banking and securities firm. It provides a wide range of services including financial advisory, asset management, and trade execution to a diversified global client base.",
        "V": "Visa Inc. is a global payments technology company. It facilitates electronic funds transfers throughout the world, most commonly through Visa-branded credit cards, debit cards, and prepaid cards.",
        "BLK": "BlackRock, Inc. is the largest asset manager in the world. It provides investment and technology services to institutional and retail clients, including the iShares line of ETFs and the Aladdin risk management system.",
        "COIN": "Coinbase Global, Inc. provides financial infrastructure and technology for the cryptoeconomy. It offers a primary financial account in the cryptoeconomy for consumers, and a marketplace with a pool of liquidity for institutions.",
        
        # Indices & ETFs
        "SPY": "The SPDR S&P 500 ETF Trust seeks to provide investment results that, before expenses, correspond generally to the price and yield performance of the S&P 500 Index, representing the large-cap segment of the US market.",
        "QQQ": "Invesco QQQ is an exchange-traded fund that tracks the Nasdaq-100 Index. It includes 100 of the largest non-financial companies listed on the Nasdaq Stock Market, offering heavy exposure to the technology and growth sectors.",
        "VOO": "Vanguard S&P 500 ETF tracks the S&P 500 Index, providing low-cost exposure to 500 of the largest companies in the U.S. It is favored by long-term investors for its ultra-low expense ratio and liquidity.",
        "VTI": "Vanguard Total Stock Market ETF tracks the CRSP US Total Market Index, providing exposure to nearly 100% of the investable U.S. equity market, including micro, small, mid, and large-cap stocks.",
        "SMH": "VanEck Semiconductor ETF tracks the performance of the MVIS US Listed Semiconductor 25 Index, offering concentrated exposure to the companies at the heart of the global chip industry and AI hardware.",
        "ARKK": "ARK Innovation ETF is an actively managed fund that targets companies poised to benefit from 'disruptive innovation' in areas such as genomics, automation, energy storage, and artificial intelligence.",
        
        # Consumer
        "WMT": "Walmart Inc. is the world's largest retailer. It operates a massive network of hypermarkets and discount stores, focusing on 'Everyday Low Prices' and an expanding e-commerce presence to compete in the digital age.",
        "COST": "Costco Wholesale Corporation operates an international chain of membership-only warehouses. Its business model focuses on high volume and low prices on a limited selection of brand-name and private-label products.",
        "RACE": "Ferrari N.V. is a world-renowned luxury performance sports car manufacturer. Beyond its iconic automotive lineup, Ferrari is a symbol of engineering excellence and exclusive brand status, fueled by its success in Formula One racing.",
        "LULU": "Lululemon Athletica Inc. is a technical athletic apparel company for yoga, running, training, and most other sweaty pursuits. It has successfully expanded from a niche yoga brand into a global leader in the athleisure market."
    }
    
    price, _, _ = get_mock_price(ticker)
    mkt_cap, pe_ratio, div_yield = random.uniform(100, 3000), random.uniform(15, 60), random.uniform(0.5, 3.5)
    category = next((k for k, v in MARKET_CATEGORIES.items() if ticker in v), "Other")
    description = descriptions.get(ticker, f"{ticker} is a leading entity in the {category} sector. The company focuses on driving operational efficiency and long-term shareholder value through innovation and market-leading positions in its core segments.")
    
    return {
        "ticker": ticker, "category": category,
        "description": description,
        "stats": {
            "market_cap": f"{mkt_cap:.2f}B", "pe_ratio": f"{pe_ratio:.2f}", "dividend_yield": f"{div_yield:.2f}%",
            "52_week_high": f"${random.uniform(price*1.1, price*1.5):.2f}", 
            "52_week_low": f"${random.uniform(price*0.6, price*0.9):.2f}", 
            "volume": f"{random.uniform(1, 40):.1f}M"
        }
    }

@app.get("/favorites")
def get_favorites(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()

@app.post("/favorites/{ticker}")
def add_favorite(ticker: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    existing = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id, models.Favorite.ticker == ticker).first()
    if existing: return existing
    new_fav = models.Favorite(user_id=current_user.id, ticker=ticker)
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    return new_fav

@app.delete("/favorites/{ticker}")
def remove_favorite(ticker: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    fav = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id, models.Favorite.ticker == ticker).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"message": "Favorite removed"}

@app.post("/trade/buy")
def buy_stock(portfolio_id: int, ticker: str, quantity: float, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id, models.Portfolio.user_id == current_user.id).first()
    if not portfolio: raise HTTPException(status_code=404, detail="Portfolio not found")
    cache_key = f"market_quote_v4:{ticker}"
    cached_data = redis_client.get(cache_key)
    if cached_data: price = json.loads(cached_data).get("price")
    else: price, _, _ = get_mock_price(ticker)
    total_cost = price * quantity
    if portfolio.balance < total_cost: raise HTTPException(status_code=400, detail="Insufficient funds")
    portfolio.balance -= total_cost
    holding = db.query(models.Holding).filter(models.Holding.portfolio_id == portfolio_id, models.Holding.ticker == ticker).first()
    if holding:
        new_q = holding.quantity + quantity
        holding.cost_basis = ((holding.cost_basis * holding.quantity) + total_cost) / new_q
        holding.quantity = new_q
    else:
        db.add(models.Holding(portfolio_id=portfolio_id, ticker=ticker, quantity=quantity, cost_basis=price))
    db.add(models.Transaction(user_id=current_user.id, ticker=ticker, type=models.TransactionType.BUY, quantity=quantity, price=price))
    db.commit()
    return {"message": "Purchase successful"}

@app.post("/trade/sell")
def sell_stock(portfolio_id: int, ticker: str, quantity: float, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id, models.Portfolio.user_id == current_user.id).first()
    if not portfolio: raise HTTPException(status_code=404, detail="Portfolio not found")
    holding = db.query(models.Holding).filter(models.Holding.portfolio_id == portfolio_id, models.Holding.ticker == ticker).first()
    if not holding or holding.quantity < quantity: raise HTTPException(status_code=400, detail="Insufficient shares")
    cache_key = f"market_quote_v4:{ticker}"
    cached_data = redis_client.get(cache_key)
    if cached_data: price = json.loads(cached_data).get("price")
    else: price, _, _ = get_mock_price(ticker)
    portfolio.balance += price * quantity
    holding.quantity -= quantity
    if holding.quantity <= 0: db.delete(holding)
    db.add(models.Transaction(user_id=current_user.id, ticker=ticker, type=models.TransactionType.SELL, quantity=quantity, price=price))
    db.commit()
    return {"message": "Sale successful"}

@app.get("/market/portfolio-data/{portfolio_id}")
async def get_portfolio_performance(portfolio_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    portfolio = db.query(models.Portfolio).options(joinedload(models.Portfolio.holdings)).filter(models.Portfolio.id == portfolio_id, models.Portfolio.user_id == current_user.id).first()
    if not portfolio: raise HTTPException(status_code=404, detail="Portfolio not found")
    
    holdings_value = 0
    symbols = [h.ticker for h in portfolio.holdings]
    quotes = await get_market_stocks(current_user, db)
    quote_map = {q['ticker']: q['price'] for q in quotes}
    
    composition = []
    for h in portfolio.holdings:
        price = quote_map.get(h.ticker, 100.0)
        value = price * h.quantity
        holdings_value += value
        composition.append({"ticker": h.ticker, "value": value, "shares": h.quantity, "price": price})
        
    # Generate mock history
    history = []
    base_value = portfolio.balance + holdings_value
    for i in range(24):
        history.append({
            "time": f"{i}:00",
            "value": round(base_value + (random.random() - 0.5) * (base_value * 0.05), 2)
        })
        
    return {
        "portfolio_id": portfolio_id,
        "name": portfolio.name,
        "balance": portfolio.balance,
        "holdings_value": round(holdings_value, 2),
        "net_worth": round(portfolio.balance + holdings_value, 2),
        "composition": composition,
        "history": history
    }
