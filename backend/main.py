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
    "Technology": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "ADBE", "INTC", "AMD", "CRM", "ORCL", "NFLX", "PYPL", "QCOM", "TXN", "AVGO", "CSCO"],
    "Finance": ["JPM", "V", "MA", "BAC", "WFC", "C", "GS", "MS", "AXP"],
    "Consumer": ["WMT", "PG", "HD", "DIS", "KO", "PEP", "COST", "NKE", "MCD", "SBUX", "TGT"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK", "TMO", "LLY", "DHR"],
    "Energy": ["XOM", "CVX", "COP", "SLB"],
    "Industrial": ["CAT", "HON", "GE", "UPS", "FDX"],
    "Real Estate": ["PLD", "AMT", "EQIX"],
    "Utilities": ["NEE", "DUK", "SO"]
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
        "AAPL": 182.50, "NVDA": 875.20, "MSFT": 415.40, "AMZN": 178.10,
        "GOOGL": 154.30, "META": 490.15, "TSLA": 175.05, "NFLX": 612.40,
        "AVGO": 1345.00, "COST": 728.90, "GS": 412.30, "AXP": 224.10,
        "JPM": 188.40, "V": 282.10, "UNH": 485.20, "HD": 355.10
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

@app.get("/market/stocks/{ticker}/details")
async def get_stock_details(ticker: str, current_user: Optional[models.User] = Depends(get_current_user, use_cache=False)):
    ticker = ticker.upper()
    descriptions = {
        "AAPL": "Apple Inc. designs, manufactures, and markets smartphones...",
        "NVDA": "NVIDIA Corporation designs, develops, and markets...",
        "TSLA": "Tesla, Inc. designs, develops, manufactures...",
        "GOOGL": "Alphabet Inc. offers various products...",
        "MSFT": "Microsoft Corporation develops, licenses..."
    }
    mkt_cap, pe_ratio, div_yield = random.uniform(100, 3000), random.uniform(15, 60), random.uniform(0.5, 3.5)
    category = next((k for k, v in MARKET_CATEGORIES.items() if ticker in v), "Other")
    return {
        "ticker": ticker, "category": category,
        "description": descriptions.get(ticker, f"{ticker} is a leader in the {category} sector."),
        "stats": {
            "market_cap": f"{mkt_cap:.2f}B", "pe_ratio": f"{pe_ratio:.2f}", "dividend_yield": f"{div_yield:.2f}%",
            "52_week_high": "$300.00", "52_week_low": "$120.00", "volume": f"{random.randint(10, 100)}M"
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
