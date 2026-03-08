from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import redis
import os

from . import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Investment Simulator API")

# Setup Redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Investment Simulator API"}

@app.get("/quote/{ticker}")
def get_quote(ticker: str):
    """
    Fetch a quote from Finnhub, caching it in Redis for 60 seconds.
    """
    # Placeholder for Finnhub logic
    cached_quote = redis_client.get(f"quote:{ticker}")
    if cached_quote:
        return {"ticker": ticker, "price": float(cached_quote), "source": "cache"}
    
    # Simulate API call
    simulated_price = 150.00
    redis_client.setex(f"quote:{ticker}", 60, simulated_price)
    
    return {"ticker": ticker, "price": simulated_price, "source": "api"}

@app.post("/trade/buy")
def buy_asset(user_id: int, ticker: str, quantity: float, db: Session = Depends(database.get_db)):
    """
    Execute a buy order for a specific ticker.
    """
    return {"message": "Trade executed successfully"}

@app.get("/portfolio/{user_id}")
def get_portfolio(user_id: int, db: Session = Depends(database.get_db)):
    """
    Get the current portfolio for a given user.
    """
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.user_id == user_id).all()
    return portfolios
