from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone

from database import Base

class TransactionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    portfolios = relationship("Portfolio", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, default="My Portfolio")
    balance = Column(Float, default=10000.0)
    ticker = Column(String, index=True, nullable=True)
    quantity = Column(Float, default=0.0)
    cost_basis = Column(Float, default=0.0)

    user = relationship("User", back_populates="portfolios")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, index=True)
    type = Column(Enum(TransactionType))
    quantity = Column(Float)
    price = Column(Float)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, index=True)

    user = relationship("User")
