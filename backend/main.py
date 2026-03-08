from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import redis
import os
import httpx
import feedparser
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import models
import database
import auth_utils

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

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Setup Redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except auth_utils.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
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
    from sqlalchemy.orm import joinedload
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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Investment Simulator API"}

from datetime import datetime, time, timezone, timedelta

def get_market_status_info():
    # NY is EDT (UTC-4) starting March 8, 2026
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
    import random
    from datetime import datetime
    
    status = get_market_status_info()
    is_open = status["is_open"]
    
    # Use a deterministic seed if the market is closed to keep prices stable
    if not is_open:
        # Seed based on ticker and current date (NY time)
        seed_str = f"{ticker}_{status['ny_time'][:10]}"
        random.seed(seed_str)
    
    base_prices = {
        "AAPL": 256.00,
        "NVDA": 800.00,
        "MSFT": 405.00,
        "AMZN": 178.00,
        "GOOGL": 152.00,
        "META": 485.00,
        "TSLA": 175.00,
    }
    base = base_prices.get(ticker, 100.0)
    
    # If market is closed, we use a fixed "fluctuation" for the day
    # If market is open, we use the default system randomness
    if not is_open:
        price = round(base + random.uniform(-base*0.02, base*0.02), 2)
        change = round(random.uniform(-base*0.01, base*0.01), 2)
        # Reset seed to avoid affecting other parts of the app
        random.seed(None)
    else:
        price = round(base + random.uniform(-base*0.02, base*0.02), 2)
        change = round(random.uniform(-base*0.01, base*0.01), 2)
        
    percent_change = round((change/price)*100, 2)
    return price, change, percent_change

@app.get("/market/stocks")
async def get_market_stocks(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    """
    Fetch live quotes for an expanded list of major stocks from Finnhub.
    Results are cached in Redis for 60 seconds.
    """
    tickers = [
        "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "ADBE",
        "JPM", "V", "MA", "BAC", "WMT", "PG", "HD", "DIS", "JNJ", "UNH",
        "XOM", "CVX"
    ]
    
    categories = {
        "Technology": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "ADBE"],
        "Finance": ["JPM", "V", "MA", "BAC"],
        "Consumer": ["WMT", "PG", "HD", "DIS"],
        "Healthcare": ["JNJ", "UNH"],
        "Energy": ["XOM", "CVX"]
    }

    results = []
    
    # Get user favorites
    favorites = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()
    fav_tickers = {f.ticker for f in favorites}

    for ticker in tickers:
        cache_key = f"market_quote_v4:{ticker}"
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            import json
            stock_info = json.loads(cached_data)
        else:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={FINNHUB_API_KEY}",
                        timeout=5.0
                    )
                    data = response.json()
                    
                    price = data.get("c") or 0.0
                    if price == 0:
                        price, change, percent_change = get_mock_price(ticker)
                    else:
                        change = data.get("d", 0.0)
                        percent_change = data.get("dp", 0.0)

                    # Mock volume and range for more "in-depth" market data
                    import random
                    stock_info = {
                        "ticker": ticker,
                        "price": price,
                        "change": change,
                        "percent_change": percent_change,
                        "volume": f"{random.randint(5, 50)}M",
                        "high_24h": round(price * 1.02, 2),
                        "low_24h": round(price * 0.98, 2),
                        "category": next((k for k, v in categories.items() if ticker in v), "Other")
                    }
                    import json
                    redis_client.setex(cache_key, 60, json.dumps(stock_info))
            except Exception:
                price, change, percent_change = get_mock_price(ticker)
                import random
                stock_info = {
                    "ticker": ticker, 
                    "price": price, 
                    "change": change,
                    "percent_change": percent_change,
                    "volume": f"{random.randint(5, 50)}M",
                    "high_24h": round(price * 1.02, 2),
                    "low_24h": round(price * 0.98, 2),
                    "category": next((k for k, v in categories.items() if ticker in v), "Other")
                }
        
        stock_info["is_favorite"] = ticker in fav_tickers
        results.append(stock_info)
                
    return results

@app.get("/market/categories/{category}")
async def get_category_stocks(category: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    stocks = await get_market_stocks(current_user, db)
    return [s for s in stocks if s.get("category").lower() == category.lower()]

@app.get("/market/news")
async def get_market_news():
    """
    Fetch live news from Yahoo Finance RSS.
    """
    cache_key = "market_news_live"
    cached_news = redis_client.get(cache_key)
    
    if cached_news:
        import json
        return json.loads(cached_news)
    
    try:
        # Yahoo Finance RSS Feed
        feed_url = "https://finance.yahoo.com/news/rssindex"
        feed = feedparser.parse(feed_url)
        
        news_items = []
        for entry in feed.entries[:10]:
            # Try to find a tag or category
            tag = "MARKET"
            if hasattr(entry, 'tags') and entry.tags:
                tag = entry.tags[0].term.upper()
            elif hasattr(entry, 'category'):
                tag = entry.category.upper()
                
            news_items.append({
                "title": entry.title,
                "link": entry.link,
                "summary": entry.summary if hasattr(entry, 'summary') else "",
                "published": entry.published if hasattr(entry, 'published') else "Just now",
                "tag": tag[:10]
            })
            
        import json
        redis_client.setex(cache_key, 300, json.dumps(news_items)) # Cache for 5 mins
        return news_items
    except Exception as e:
        print(f"News fetch error: {e}")
        return [
            {"title": "Global markets react to latest economic data", "published": "2m ago", "tag": "MACRO"},
            {"title": "Tech sector sees renewed interest amid AI breakthroughs", "published": "15m ago", "tag": "TECH"},
            {"title": "Energy stocks fluctuate following supply reports", "published": "45m ago", "tag": "ENERGY"}
        ]

@app.get("/market/config")
def get_market_config():
    return {"api_key_configured": FINNHUB_API_KEY != "sandbox_c8r831aad3i9vba1p0a0"}

@app.get("/market/search")
async def search_stock(symbol: str, current_user: models.User = Depends(get_current_user)):
    symbol = symbol.upper()
    cache_key = f"market_quote_v3:{symbol}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        import json
        return json.loads(cached_data)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_API_KEY}",
                timeout=5.0
            )
            data = response.json()
            price = data.get("c") or 0.0
            if price == 0:
                price, change, percent_change = get_mock_price(symbol)
            else:
                change = data.get("d", 0.0)
                percent_change = data.get("dp", 0.0)
            
            category = next((k for k, v in categories.items() if symbol in v), "Other")
            stock_info = {
                "ticker": symbol,
                "price": price,
                "change": change,
                "percent_change": percent_change,
                "volume": f"{random.randint(5, 50)}M",
                "high_24h": round(price * 1.02, 2),
                "low_24h": round(price * 0.98, 2),
                "category": category
            }
            import json
            redis_client.setex(cache_key, 60, json.dumps(stock_info))
            return stock_info
    except Exception:
        price, change, percent_change = get_mock_price(symbol)
        category = next((k for k, v in categories.items() if symbol in v), "Other")
        return {
            "ticker": symbol, 
            "price": price, 
            "change": change, 
            "percent_change": percent_change,
            "volume": "--",
            "high_24h": round(price * 1.02, 2),
            "low_24h": round(price * 0.98, 2),
            "category": category
        }

@app.get("/market/stocks/{ticker}/details")
async def get_stock_details(ticker: str, current_user: models.User = Depends(get_current_user)):
    ticker = ticker.upper()
    # In a real app, this would fetch from a company profile API
    # We'll provide high-fidelity mock data for the Robinhood-style experience
    descriptions = {
        "AAPL": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. Its signature products include the iPhone, Mac, iPad, and Apple Watch.",
        "NVDA": "NVIDIA Corporation designs, develops, and markets three-dimensional graphics processors and related software. The company offers products that provide interactive 3-room graphics for the mainstream personal computer market.",
        "TSLA": "Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems in the United States, China, and internationally.",
        "GOOGL": "Alphabet Inc. offers various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America. It operates through Google Services, Google Cloud, and Other Bets segments.",
        "MSFT": "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide. The company operates in three segments: Productivity and Business Processes, Intelligent Cloud, and More Personal Computing."
    }
    
    import random
    mkt_cap = random.uniform(100, 3000) # Billion
    pe_ratio = random.uniform(15, 60)
    div_yield = random.uniform(0.5, 3.5)
    high_52 = 300.00
    low_52 = 120.00
    
    categories = {
        "Technology": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "ADBE"],
        "Finance": ["JPM", "V", "MA", "BAC"],
        "Consumer": ["WMT", "PG", "HD", "DIS"],
        "Healthcare": ["JNJ", "UNH"],
        "Energy": ["XOM", "CVX"]
    }
    category = next((k for k, v in categories.items() if ticker in v), "Other")

    return {
        "ticker": ticker,
        "category": category,
        "description": descriptions.get(ticker, f"{ticker} is a leading entity in the global {category} sector, recognized for its strategic market position and commitment to operational excellence within the digital economy."),
        "stats": {
            "market_cap": f"{mkt_cap:.2f}B",
            "pe_ratio": f"{pe_ratio:.2f}",
            "dividend_yield": f"{div_yield:.2f}%",
            "52_week_high": f"${high_52:.2f}",
            "52_week_low": f"${low_52:.2f}",
            "volume": f"{random.randint(10, 100)}M"
        }
    }

@app.get("/favorites")
def get_favorites(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()

@app.post("/favorites/{ticker}")
def add_favorite(ticker: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.ticker == ticker
    ).first()
    if existing:
        return existing
    
    new_fav = models.Favorite(user_id=current_user.id, ticker=ticker)
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    return new_fav

@app.delete("/favorites/{ticker}")
def remove_favorite(ticker: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.ticker == ticker
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"message": "Favorite removed"}

@app.post("/trade/buy")
def buy_stock(portfolio_id: int, ticker: str, quantity: float, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    status = get_market_status_info()
    if not status["is_open"]:
        # We allow trading but add a warning or handle differently? 
        # User requested balance changes even if closed, but complained.
        # Let's keep it open for "simulation" purposes but maybe log the warning.
        pass

    # Prioritize Finnhub data from Redis cache
    cache_key = f"market_quote_v3:{ticker}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        import json
        stock_info = json.loads(cached_data)
        price = stock_info.get("price")
    else:
        # Fallback to mock price if not in cache
        price, _, _ = get_mock_price(ticker)

    total_cost = price * quantity
    
    if portfolio.balance < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    portfolio.balance -= total_cost
    
    holding = db.query(models.Holding).filter(
        models.Holding.portfolio_id == portfolio_id,
        models.Holding.ticker == ticker
    ).first()
    
    if holding:
        new_quantity = holding.quantity + quantity
        holding.cost_basis = ((holding.cost_basis * holding.quantity) + total_cost) / new_quantity
        holding.quantity = new_quantity
    else:
        new_holding = models.Holding(
            portfolio_id=portfolio_id,
            ticker=ticker,
            quantity=quantity,
            cost_basis=price
        )
        db.add(new_holding)

    transaction = models.Transaction(
        user_id=current_user.id,
        ticker=ticker,
        type=models.TransactionType.BUY,
        quantity=quantity,
        price=price
    )
    db.add(transaction)
    db.commit()
    db.refresh(portfolio)
    return {"message": "Purchase successful", "portfolio": portfolio}

@app.post("/trade/sell")
def sell_stock(portfolio_id: int, ticker: str, quantity: float, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holding = db.query(models.Holding).filter(
        models.Holding.portfolio_id == portfolio_id,
        models.Holding.ticker == ticker
    ).first()
    
    if not holding or holding.quantity < quantity:
        raise HTTPException(status_code=400, detail="Insufficient shares")

    price, _, _ = get_mock_price(ticker)

    # Try to get price from cache to ensure consistency with what user saw
    cache_key = f"market_quote_v3:{ticker}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        import json
        stock_info = json.loads(cached_data)
        price = stock_info.get("price", price)

    portfolio.balance += price * quantity
    holding.quantity -= quantity
    
    if holding.quantity <= 0:
        db.delete(holding)

    transaction = models.Transaction(
        user_id=current_user.id,
        ticker=ticker,
        type=models.TransactionType.SELL,
        quantity=quantity,
        price=price
    )
    db.add(transaction)
    db.commit()
    db.refresh(portfolio)
    return {"message": "Sale successful", "portfolio": portfolio}

@app.get("/portfolio/{user_id}")
def get_portfolio_legacy(user_id: int, db: Session = Depends(database.get_db)):
    # Redundant but kept for compatibility
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.user_id == user_id).all()
    return portfolios
